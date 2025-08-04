import TrainingModeControl from '@/components/TrainingModeControl';

export default function TrainingModePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Mode</h1>
          <p className="text-gray-600 mt-2">
            Configure automated trade execution for machine learning data collection
          </p>
        </div>
      </div>
      
      <TrainingModeControl />
    </div>
  );
}
