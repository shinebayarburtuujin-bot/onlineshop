// Барааны үнэлгээ, сэтгэгдлийг Supabase reviews хүснэгттэй холбоно.
import { supabase } from "./supabase.js";

const productId = new URLSearchParams(location.search).get("id");
const summary = document.querySelector("#reviewSummary");
const form = document.querySelector("#reviewForm");

async function loadReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    summary.innerHTML = `<p>Сэтгэгдэл уншихад алдаа гарлаа: ${error.message}</p>`;
    return;
  }

  const reviews = data || [];
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  summary.innerHTML = `<strong>${average.toFixed(1)}</strong>
    <p>${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}<br>
      <small>${reviews.length} үнэлгээ</small>
    </p>
    <div>${reviews.map(review => `<blockquote>
      “${review.comment}”
      <cite>${new Intl.DateTimeFormat("mn-MN").format(new Date(review.created_at))}</cite>
    </blockquote>`).join("") || "Одоогоор сэтгэгдэл байхгүй."}</div>`;
}

form.onsubmit = async event => {
  event.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = "login.html";
    return;
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    product_id: productId,
    rating: Number(document.querySelector("#reviewRating").value),
    comment: document.querySelector("#reviewComment").value.trim()
  });
  const message = document.querySelector("#reviewMessage");
  if (error) message.textContent = `Алдаа: ${error.message}`;
  else {
    message.textContent = "Сэтгэгдэл амжилттай хадгалагдлаа.";
    form.reset();
    await loadReviews();
  }
};

loadReviews();
