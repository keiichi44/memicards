import { useLocation } from "wouter";
import { BatchImport } from "@/components/batch-import";

export default function Import() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="p-6">
      <BatchImport onComplete={() => setLocation("/")} />
    </div>
  );
}
