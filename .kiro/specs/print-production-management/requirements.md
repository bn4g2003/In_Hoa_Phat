# Requirements Document - Print Production Management System

## Introduction

Hệ thống Quản lý Sản xuất In ấn (Print Production Management System) là ứng dụng web quản lý toàn bộ quy trình sản xuất in ấn từ khi nhận đơn hàng đến khi hoàn thành. Hệ thống hỗ trợ 2 portal: Management Portal cho quản lý cấp cao và Operation Portal cho các bộ phận vận hành. Hệ thống kết nối trực tiếp với Supabase, sử dụng Ant Design cho giao diện, và có cơ chế phân quyền dựa trên role.

## Glossary

- **PPMS**: Print Production Management System - Hệ thống Quản lý Sản xuất In ấn
- **Management Portal**: Giao diện dành cho Quản lý, Giám đốc, Kế toán, Điều phối
- **Operation Portal**: Giao diện dành cho các bộ phận sản xuất (Tầng G, 1, 3, 4, 5, In Offset, Kho 2)
- **Lệnh Sản Xuất (LSX)**: Đơn hàng sản xuất được tạo từ yêu cầu của khách hàng
- **Task**: Công việc được giao cho một bộ phận cụ thể trong quy trình sản xuất
- **Bộ phận**: Đơn vị vận hành bao gồm Tầng G, Tầng 1, Tầng 3, Tầng 4, Tầng 5, In Offset, Kho 2
- **Workflow**: Chuỗi công việc nối tiếp giữa các bộ phận
- **KPI**: Key Performance Indicator - Chỉ số hiệu suất công việc
- **Hoãn hợp lệ**: Trạng thái hoãn công việc do thiếu vật tư, KPI chuyển sang Kho
- **Role**: Vai trò người dùng trong hệ thống

## Requirements

### Requirement 1: Authentication & Authorization

**User Story:** As a user, I want to login with my credentials, so that I can access the system according to my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Auth_System SHALL authenticate against Supabase database and create a session
2. WHEN a user submits invalid credentials, THE Auth_System SHALL display an error message and not create a session
3. THE Auth_System SHALL store passwords directly in the database without using Supabase Auth
4. WHEN a user logs in successfully, THE Auth_System SHALL redirect the user to the appropriate portal based on role
5. THE Auth_System SHALL support the following fixed roles: Quản lý, Giám đốc, Kế toán, Điều phối, Tầng G, Tầng 1, Tầng 3, Tầng 4, Tầng 5, In Offset, Kho 2
6. WHEN a user with Role 1, 4, or 5 logs in, THE Auth_System SHALL redirect to Management Portal
7. WHEN a user with Role Tầng G, Tầng 1, Tầng 3, Tầng 4, Tầng 5, In Offset, or Kho 2 logs in, THE Auth_System SHALL redirect to Operation Portal
8. WHEN an unauthenticated user accesses a protected route, THE Auth_System SHALL redirect to the login page

---

### Requirement 2: Navigation & Layout

**User Story:** As a user, I want a consistent navigation experience, so that I can easily move between different modules.

#### Acceptance Criteria

1. THE UI_System SHALL display a vertical navigation bar on the left side of the screen
2. THE UI_System SHALL display breadcrumb navigation showing the current location in the application hierarchy
3. THE UI_System SHALL use Ant Design components for all UI elements
4. WHEN a user navigates to any list page, THE UI_System SHALL display action buttons (view/edit/delete) pinned at the bottom of the table
5. THE UI_System SHALL provide filter controls, search boxes, and export buttons (Excel/PDF) on all list pages
6. THE UI_System SHALL display content appropriate to the user's role and portal

---

### Requirement 3: Customer Management (CRM)

**User Story:** As a manager, I want to manage customer information, so that I can track customer relationships and orders.

#### Acceptance Criteria

1. WHEN a user with Management Portal access opens the CRM module, THE CRM_System SHALL display a list of all customers
2. THE CRM_System SHALL provide search functionality to find customers by name, phone, or email
3. THE CRM_System SHALL provide filter controls to filter customers by status, creation date, or outstanding balance
4. WHEN a user clicks on a customer row, THE CRM_System SHALL open a detail modal with 3 tabs
5. THE CRM_System SHALL display the "Thông tin chung" tab with CRUD operations for customer basic information
6. THE CRM_System SHALL display the "Danh sách Lệnh sản xuất" tab showing all production orders for that customer
7. THE CRM_System SHALL display the "Báo cáo Công nợ" tab showing debt summary and payment history
8. WHEN a user clicks the export button, THE CRM_System SHALL generate an Excel or PDF file with the current filtered customer list
9. THE CRM_System SHALL restrict access to users with Role Quản lý, Giám đốc, Kế toán, or Điều phối

---

### Requirement 4: Order Management & Workflow Routing

**User Story:** As a coordinator, I want to create production orders and assign them to departments, so that work flows through the production pipeline.

#### Acceptance Criteria

1. WHEN a user with appropriate role opens the Order module, THE Order_System SHALL display a list of all production orders
2. WHEN a user creates a new Lệnh Sản Xuất, THE Order_System SHALL display a form with production details and department selection checkboxes
3. THE Order_System SHALL allow selection of departments in sequence: Tầng 1 → Tầng 3 → Kho 2 (and other valid workflows)
4. WHEN a production order is created, THE Order_System SHALL create Tasks for each selected department in sequence
5. WHEN a user clicks on an order row, THE Order_System SHALL open a detail modal with 4 tabs
6. THE Order_System SHALL display the "Thông tin in ấn" tab showing print specifications, quantity, materials, and deadline
7. THE Order_System SHALL display the "Theo dõi Tiến độ" tab with a Progress Bar showing completion percentage per department
8. THE Order_System SHALL display the "Dòng tiền" tab showing payment schedule, received payments, and remaining balance
9. THE Order_System SHALL display the "Lịch sử Xử lý sự cố" tab showing all incidents and their resolutions
10. THE Order_System SHALL enforce sequential workflow: a department can only receive work when the previous department marks their task as Done
11. THE Order_System SHALL provide export functionality for orders in Excel and PDF formats

---

### Requirement 5: Sequential Workflow Logic

**User Story:** As a production worker, I want to only see tasks that are ready for my department, so that I don't work on orders that are not yet at my stage.

#### Acceptance Criteria

1. WHEN a department's preceding department has not completed their task, THE Workflow_System SHALL NOT display the task to the current department
2. WHEN the preceding department marks their task as Done, THE Workflow_System SHALL make the task visible to the next department
3. THE Workflow_System SHALL track the status of each task: Pending, In Progress, Done, Issue, On Hold
4. WHEN all tasks in a workflow are Done, THE Workflow_System SHALL mark the production order as Complete
5. THE Workflow_System SHALL support parallel workflows where multiple departments can work simultaneously on independent tasks

---

### Requirement 6: Management Dashboard

**User Story:** As a manager, I want to see an overview of all production progress, so that I can identify bottlenecks and delays.

#### Acceptance Criteria

1. WHEN a user with Management Portal access opens the Dashboard, THE Dashboard_System SHALL display a Kanban or Gantt-style progress board
2. THE Dashboard_System SHALL display order names as vertical rows and departments as horizontal columns
3. THE Dashboard_System SHALL use color coding: Blue for on-schedule tasks, Red for tasks delayed more than 1 hour without acknowledgment
4. WHEN a user hovers over a task cell, THE Dashboard_System SHALL display a tooltip with task details and timing
5. THE Dashboard_System SHALL provide filtering by date range, customer, order status, and department
6. THE Dashboard_System SHALL display summary statistics: total orders, completion rate, average delay time
7. THE Dashboard_System SHALL restrict access to users with Role Quản lý, Giám đốc, Kế toán, or Điều phối

---

### Requirement 7: Production Operation Module

**User Story:** As a production worker, I want to see and manage my assigned tasks, so that I can complete my work efficiently.

#### Acceptance Criteria

1. WHEN a user with Operation Portal access opens the Operation module, THE Operation_System SHALL display only tasks assigned to their department
2. THE Operation_System SHALL only display tasks where the preceding department has completed their work
3. WHEN a user clicks on a task row, THE Operation_System SHALL open a detail modal with 3 tabs
4. THE Operation_System SHALL display the "Thao tác KPI" tab with buttons: Nhận việc (Acknowledge), Hoàn thành (Complete), Báo sự cố (Report Issue)
5. WHEN a user clicks "Nhận việc", THE Operation_System SHALL record the acknowledgment timestamp and change task status to In Progress
6. WHEN a user clicks "Hoàn thành", THE Operation_System SHALL record the completion timestamp and change task status to Done
7. WHEN a user clicks "Báo sự cố", THE Operation_System SHALL prompt for issue details and change task status to Issue
8. THE Operation_System SHALL display the "Thông số Máy & Gia công" tab showing machine parameters and processing specifications
9. THE Operation_System SHALL display the "Vật tư & Trạng thái Hoãn hợp lệ" tab showing materials status and valid hold conditions
10. WHEN a task is put on hold due to missing materials, THE Operation_System SHALL transfer KPI responsibility to Kho 2 department

---

### Requirement 8: Valid Hold Logic (Hoãn hợp lệ)

**User Story:** As a production worker, I want to report material shortages that block my work, so that the responsibility is transferred to the warehouse.

#### Acceptance Criteria

1. WHEN a user reports missing materials, THE Hold_System SHALL create a valid hold record
2. WHEN a valid hold is created, THE Hold_System SHALL change the task status to On Hold
3. WHEN a valid hold is created, THE Hold_System SHALL transfer KPI tracking to Kho 2 department
4. THE Hold_System SHALL track the hold reason, timestamp, and responsible party
5. WHEN Kho 2 provides the missing materials, THE Hold_System SHALL release the hold and return KPI responsibility to the original department
6. THE Hold_System SHALL calculate hold duration and exclude it from the original department's performance metrics

---

### Requirement 9: Warehouse Management Module

**User Story:** As a warehouse worker, I want to track material receipts and usage, so that I can manage inventory efficiently.

#### Acceptance Criteria

1. WHEN a user with Kho 2 role opens the Warehouse module, THE Warehouse_System SHALL display material receipt history
2. THE Warehouse_System SHALL provide a calculation tool for converting paper sizes to A4 standard equivalent
3. THE Warehouse_System SHALL track material inventory levels
4. WHEN a material is low on stock, THE Warehouse_System SHALL display a warning indicator
5. THE Warehouse_System SHALL record all material transactions (receipt, usage, transfer)
6. THE Warehouse_System SHALL provide search and filter functionality for material history

---

### Requirement 10: Role-Based Access Control

**User Story:** As a system administrator, I want to control what each role can see and do, so that users only access appropriate functionality.

#### Acceptance Criteria

1. THE RBAC_System SHALL enforce the following role permissions:
   - **Quản lý (Role 1)**: Full access to Management Portal, all modules, all operations
   - **Giám đốc (Role 4)**: Full access to Management Portal, read-only on financial data
   - **Kế toán (Role 5)**: Access to Management Portal, CRM, Order financial tabs, Dashboard
   - **Điều phối**: Access to Management Portal, Order Management, Dashboard, create and edit orders
   - **Tầng G/Tầng 1/Tầng 3/Tầng 4/Tầng 5/In Offset**: Access to Operation Portal, only their department's tasks
   - **Kho 2**: Access to Operation Portal, Warehouse module, and tasks requiring material resolution
2. WHEN a user attempts to access a module outside their role, THE RBAC_System SHALL deny access and display an error message
3. THE RBAC_System SHALL hide navigation items for modules the user cannot access
4. THE RBAC_System SHALL apply permissions consistently across both portals

---

### Requirement 11: Data Export

**User Story:** As a manager, I want to export data to Excel and PDF, so that I can share reports with stakeholders.

#### Acceptance Criteria

1. WHEN a user clicks the Excel export button, THE Export_System SHALL generate an Excel file with the current filtered data
2. WHEN a user clicks the PDF export button, THE Export_System SHALL generate a PDF file with the current filtered data
3. THE Export_System SHALL include all visible columns in the export
4. THE Export_System SHALL apply current filter and search criteria to the exported data
5. THE Export_System SHALL generate files with Vietnamese character support
6. THE Export_System SHALL provide meaningful file names including the module name and export date

---

### Requirement 12: Database Connection

**User Story:** As a developer, I want the system to connect to Supabase directly, so that data is persisted reliably.

#### Acceptance Criteria

1. THE Database_System SHALL connect to Supabase using URL and anon key from environment variables
2. THE Database_System SHALL NOT use Supabase Auth for authentication
3. THE Database_System SHALL NOT implement Row Level Security (RLS) in the initial version
4. THE Database_System SHALL store passwords directly in the database with appropriate hashing
5. THE Database_System SHALL handle connection errors gracefully with appropriate error messages
6. THE Database_System SHALL support all CRUD operations required by the modules

---

### Requirement 13: UI Design Principles

**User Story:** As a user, I want a clean and efficient interface, so that I can work without distractions.

#### Acceptance Criteria

1. THE UI_System SHALL NOT display empty or unused space unnecessarily
2. THE UI_System SHALL NOT include decorative elements that do not serve a functional purpose
3. THE UI_System SHALL display information density appropriate for professional use
4. THE UI_System SHALL use consistent spacing, colors, and typography throughout the application
5. THE UI_System SHALL provide responsive design for different screen sizes
6. THE UI_System SHALL display role-appropriate content without cluttering the interface
