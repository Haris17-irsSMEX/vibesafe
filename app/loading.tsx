export default function AppLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-cc-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cc-border-strong border-t-cc-text"></div>
        <p className="text-sm font-medium text-cc-muted">Loading CtrlCode...</p>
      </div>
    </div>
  )
}
