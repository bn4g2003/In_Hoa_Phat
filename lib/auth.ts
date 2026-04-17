import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: {
    id: number;
    name: string;
    portal: 'management' | 'operation';
  };
  department?: {
    id: number;
    name: string;
    code: string;
  };
  department_id?: number;
}

// Role permissions mapping (static - based on business rules)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Quản lý': ['dashboard', 'crm', 'orders', 'organization', 'config', 'profile'],
  'Giám đốc': ['dashboard', 'crm', 'orders', 'organization', 'profile'],
  'Kế toán': ['dashboard', 'crm', 'orders', 'profile'],
  'Điều phối': ['dashboard', 'orders', 'profile'],
  'Sản xuất': ['tasks', 'profile'],
  'Kho': ['tasks', 'warehouse', 'profile'],
};

// Cache for dynamic data
let departmentPermissionsCache: Record<string, string[]> | null = null;
let workflowTemplatesCache: any[] | null = null;
let entryDepartmentsCache: number[] | null = null;

// Fetch department permissions from database
export async function getDepartmentPermissions(): Promise<Record<string, string[]>> {
  if (departmentPermissionsCache) return departmentPermissionsCache;
  
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('code, permissions');
    
    if (error) throw error;
    
    const permissions: Record<string, string[]> = {};
    data?.forEach(dept => {
      permissions[dept.code] = dept.permissions || ['tasks'];
    });
    
    departmentPermissionsCache = permissions;
    return permissions;
  } catch (err) {
    console.error('Error fetching department permissions:', err);
    // Fallback to default
    return {
      'FLG': ['tasks'],
      'FL1': ['tasks'],
      'FL3': ['tasks'],
      'FL4': ['tasks'],
      'FL5': ['tasks'],
      'OFFSET': ['tasks'],
      'WH2': ['tasks', 'warehouse'],
    };
  }
}

// Fetch workflow templates from database
export async function getWorkflowTemplates(): Promise<any[]> {
  if (workflowTemplatesCache) return workflowTemplatesCache;
  
  try {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    workflowTemplatesCache = data || [];
    return workflowTemplatesCache || [];
  } catch (err) {
    console.error('Error fetching workflow templates:', err);
    return [];
  }
}

// Fetch entry point departments
export async function getEntryDepartments(): Promise<number[]> {
  if (entryDepartmentsCache) return entryDepartmentsCache;
  
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id')
      .eq('is_entry_point', true);
    
    if (error) throw error;
    
    entryDepartmentsCache = data?.map(d => d.id) || [];
    return entryDepartmentsCache || [];
  } catch (err) {
    console.error('Error fetching entry departments:', err);
    // Fallback
    return [1, 2, 6]; // FLG, FL1, OFFSET
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('ppms_user');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem('ppms_user', JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem('ppms_user');
}

// Check permission using cached or fetched data
export async function hasPermissionAsync(user: User, module: string): Promise<boolean> {
  const roleName = user.role?.name;
  if (!roleName) return false;
  
  // Management portal permissions
  if (user.role?.portal === 'management') {
    const permissions = ROLE_PERMISSIONS[roleName] || [];
    return permissions.includes(module);
  }
  
  // Operation portal permissions - fetch from database
  if (user.role?.portal === 'operation') {
    const deptCode = user.department?.code;
    if (!deptCode) return false;
    
    const deptPermissions = await getDepartmentPermissions();
    const permissions = deptPermissions[deptCode] || [];
    return permissions.includes(module);
  }
  
  return false;
}

// Synchronous version using fallback
export function hasPermission(user: User, module: string): boolean {
  const roleName = user.role?.name;
  if (!roleName) return false;
  
  if (user.role?.portal === 'management') {
    const permissions = ROLE_PERMISSIONS[roleName] || [];
    return permissions.includes(module);
  }
  
  if (user.role?.portal === 'operation') {
    const deptCode = user.department?.code;
    if (!deptCode) return false;
    
    // Use cached if available, otherwise fallback
    if (departmentPermissionsCache) {
      const permissions = departmentPermissionsCache[deptCode] || [];
      return permissions.includes(module);
    }
    
    // Fallback permissions
    const fallbackPermissions: Record<string, string[]> = {
      'FLG': ['tasks'],
      'FL1': ['tasks'],
      'FL3': ['tasks'],
      'FL4': ['tasks'],
      'FL5': ['tasks'],
      'OFFSET': ['tasks'],
      'WH2': ['tasks', 'warehouse'],
    };
    const permissions = fallbackPermissions[deptCode] || [];
    return permissions.includes(module);
  }
  
  return false;
}

export function canAccessPortal(user: User, portal: 'management' | 'operation'): boolean {
  return user.role?.portal === portal;
}

export function getAccessibleModules(user: User): string[] {
  const roleName = user.role?.name;
  if (!roleName) return [];
  
  if (user.role?.portal === 'management') {
    return ROLE_PERMISSIONS[roleName] || [];
  }
  
  if (user.role?.portal === 'operation') {
    const deptCode = user.department?.code;
    if (!deptCode) return [];
    
    // Use cached if available
    if (departmentPermissionsCache) {
      return departmentPermissionsCache[deptCode] || [];
    }
    
    // Fallback
    const fallbackPermissions: Record<string, string[]> = {
      'FLG': ['tasks'],
      'FL1': ['tasks'],
      'FL3': ['tasks'],
      'FL4': ['tasks'],
      'FL5': ['tasks'],
      'OFFSET': ['tasks'],
      'WH2': ['tasks', 'warehouse'],
    };
    return fallbackPermissions[deptCode] || [];
  }
  
  return [];
}

// Validate workflow - async version
export async function validateWorkflowAsync(departmentIds: number[]): Promise<{ valid: boolean; error?: string }> {
  if (!departmentIds || departmentIds.length === 0) {
    return { valid: false, error: 'Vui lòng chọn ít nhất 1 bộ phận' };
  }
  
  // Get entry departments from database
  const entryDepts = await getEntryDepartments();
  
  // Check if first department is an entry point
  if (!entryDepts.includes(departmentIds[0])) {
    return { 
      valid: false, 
      error: 'Quy trình phải bắt đầu từ bộ phận có thể nhận việc đầu tiên' 
    };
  }
  
  return { valid: true };
}

// Synchronous validation with fallback
export function validateWorkflow(departmentIds: number[]): { valid: boolean; error?: string } {
  if (!departmentIds || departmentIds.length === 0) {
    return { valid: false, error: 'Vui lòng chọn ít nhất 1 bộ phận' };
  }
  
  // Use cached if available
  if (entryDepartmentsCache) {
    if (!entryDepartmentsCache.includes(departmentIds[0])) {
      return { 
        valid: false, 
        error: 'Quy trình phải bắt đầu từ bộ phận có thể nhận việc đầu tiên' 
      };
    }
  } else {
    // Fallback entry points
    const validFirstSteps = [1, 2, 6]; // Tầng G, Tầng 1, In Offset
    if (!validFirstSteps.includes(departmentIds[0])) {
      return { 
        valid: false, 
        error: 'Quy trình phải bắt đầu từ Tầng G, Tầng 1 hoặc In Offset' 
      };
    }
  }
  
  return { valid: true };
}

export function isTaskReadyForDepartment(task: any, userDepartmentId: number): boolean {
  if (task.status !== 'ready') return false;
  if (task.department_id !== userDepartmentId) return false;
  return true;
}

export function canUserProcessTask(user: User, task: any): boolean {
  // Kho 2 can process tasks with material shortage from any department
  if (user.department?.code === 'WH2' && task.material_shortage) {
    return true;
  }
  
  // Regular department can only process their own tasks
  if (task.department_id === user.department_id) {
    return true;
  }
  
  return false;
}

// Clear cache function (call when data changes)
export function clearCache() {
  departmentPermissionsCache = null;
  workflowTemplatesCache = null;
  entryDepartmentsCache = null;
}
