import { TopNav } from "@/components/TopNav";
import { DesignerSidebar } from "@/components/DesignerSidebar";

export default function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-0">
      <TopNav />
      <div className="flex">
        <DesignerSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
