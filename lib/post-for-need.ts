/** Link to /dashboard/post pre-filled from a receiver's request (title, meals, diet). */
export function postForNeedUrl(n: { title: string; mealsNeeded?: number; meals?: number; diet: string }) {
  const p = new URLSearchParams({ title: n.title.slice(0, 80), meals: String(n.mealsNeeded ?? n.meals ?? 10), diet: n.diet });
  return `/dashboard/post?${p.toString()}`;
}
