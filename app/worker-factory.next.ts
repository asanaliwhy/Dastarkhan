export default function createPlannerWorker() {
  return new Worker(new URL('./planner-worker.ts', import.meta.url), { type: 'module' });
}
