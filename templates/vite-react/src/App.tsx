export default function App() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {document.title}
      </h1>
      <p className="mt-4 text-neutral-600">
        Served from <code>{import.meta.env.BASE_URL}</code>. Edit{' '}
        <code>src/App.tsx</code> to get started.
      </p>
    </main>
  )
}
