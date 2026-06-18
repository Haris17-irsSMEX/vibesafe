export default function AppLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-sm font-medium text-slate-500">Loading VibeSafe...</p>
      </div>
    </div>
  )
}
