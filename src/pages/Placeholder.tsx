export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">Halaman {title} dalam pengembangan.</p>
    </div>
  );
}
