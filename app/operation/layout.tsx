import MainLayout from "../../components/layouts/MainLayout";

export default function OperationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout portal="operation">{children}</MainLayout>;
}
