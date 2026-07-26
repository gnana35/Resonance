import { TopNav } from "@/components/TopNav";
import { WriterSidebar } from "@/components/WriterSidebar";
import { CharactersLayout } from "./CharactersLayout";

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
        <main className="min-w-0 flex-1">
          <CharactersLayout>{children}</CharactersLayout>
        </main>
      </div>
    </div>
  );
}
