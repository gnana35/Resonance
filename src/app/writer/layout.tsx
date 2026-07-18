import { TopNav } from "@/components/TopNav";
import { WriterSidebar } from "@/components/WriterSidebar";

export default function WriterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-0">
      <TopNav />
      <div className="flex">
        <WriterSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
