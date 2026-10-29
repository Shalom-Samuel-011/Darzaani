export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-transparent px-5 py-16 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
        <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-[#eadfce]" />
        <div className="space-y-6 py-4">
          <div className="h-4 w-32 animate-pulse rounded bg-[#eadfce]" />
          <div className="h-12 w-4/5 animate-pulse rounded bg-[#eadfce]" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-[#eadfce]" />
          <div className="h-24 animate-pulse rounded bg-[#eadfce]" />
          <div className="h-12 w-full animate-pulse rounded-full bg-[#eadfce]" />
        </div>
      </div>
    </div>
  );
}
