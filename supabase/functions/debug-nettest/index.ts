Deno.serve(async () => {
  const res = await fetch("https://lite.duckduckgo.com/lite/?q=test", {
    signal: AbortSignal.timeout(12000),
  });
  const text = await res.text();
  return new Response(
    JSON.stringify({
      status: res.status,
      head: text.slice(0, 600).replace(/\s+/g, " "),
    }),
    { headers: { "content-type": "application/json" } },
  );
});
