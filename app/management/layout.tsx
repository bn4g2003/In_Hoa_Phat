import MainLayout from "../../components/layouts/MainLayout";

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout portal="management">{children}</MainLayout>;
}
