import { RefreshCw } from "lucide-react";

const Loading = () => {
  return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
  );
};

export default Loading;
