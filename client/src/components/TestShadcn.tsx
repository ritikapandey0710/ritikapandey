import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestShadcn() {
  return (
    <div className="p-4">
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Shadcn UI Test</h2>
        <Button className="mb-2">Click Me</Button>
      </Card>
    </div>
  );
}
