// Хэрэглэгчийн захиалгуудыг Supabase orders хүснэгтээс бодитоор харуулна.
import { supabase } from "./supabase.js";
import { addVariantToCart, money, productImage, requireUser } from "./store.js";

const content = document.querySelector(".account-content");
const filter = document.querySelector("#orderFilter");
let user = null;
let orders = [];

// HTML-д байсан жишээ захиалгын картуудыг устгана.
document.querySelectorAll(".order-card").forEach(card => card.remove());
const orderList = document.createElement("div");
orderList.id = "ordersList";
content.appendChild(orderList);

// Нэвтэрсэн хэрэглэгчийн өөрийн захиалгуудыг барааны мөрүүдтэй нь авна.
async function loadOrders() {
  user = await requireUser();
  if (!user) return;
  orderList.innerHTML = `<p>Захиалгуудыг уншиж байна...</p>`;

  const { data, error } = await supabase
    .from("orders")
    // Захиалгын variant-аас бүтээгдэхүүн болон зургийг нь хамтад нь уншина.
    .select(`
      *,
      items:order_items(
        *,
        variant:product_variants(
          product:products(
            images:product_images(*)
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    orderList.innerHTML = `<p>Захиалга уншихад алдаа гарлаа: ${error.message}</p>`;
    return;
  }
  orders = data || [];
  renderOrders();
}

// Сонгосон төлөвт тохирох захиалгын картуудыг зурна.
function renderOrders() {
  const selectedStatus = filter.value;
  const visible = orders.filter(order =>
    selectedStatus === "all" || order.order_status === selectedStatus
  );

  orderList.innerHTML = visible.length
    ? visible.map(order => `<article class="order-card" data-status="${order.order_status}">
        <header class="order-card-head">
          <div><small>Захиалгын дугаар</small><b>${order.order_number}</b></div>
          <div><small>Захиалсан өдөр</small><b>${formatDate(order.created_at)}</b></div>
          <div><small>Нийт төлбөр</small><b>${money(order.total_amount)}</b></div>
          <span class="status ${order.order_status}">${statusText(order.order_status)}</span>
        </header>
        <div class="order-products">
          ${(order.items || []).map(item => {
            const image = productImage(item.variant?.product);
            return `<div class="order-product">
            <span
              class="order-thumb ${image ? "has-photo" : "sage"}"
              ${image ? `style="background-image:url('${image}')"` : ""}
            ></span>
            <div>
              <b>${item.product_name}</b>
              <small>Өнгө: ${item.color || "-"} · Размер: ${item.size === "One Size" ? "Размергүй" : item.size || "-"} · ${item.quantity}ш</small>
            </div>
          </div>`;
          }).join("")}
        </div>
        <footer class="order-card-actions">
          <button class="outline-button" data-detail="${order.id}">Дэлгэрэнгүй</button>
          <button class="text-link" data-reorder="${order.id}">Дахин захиалах →</button>
        </footer>
      </article>`).join("")
    : `<p class="empty-state">Тохирох захиалга байхгүй байна.</p>`;
}

filter.addEventListener("change", renderOrders);

// Дэлгэрэнгүй болон дахин захиалах товчнуудыг ажиллуулна.
orderList.addEventListener("click", async event => {
  const detailButton = event.target.closest("[data-detail]");
  const reorderButton = event.target.closest("[data-reorder]");

  if (detailButton) {
    const card = detailButton.closest(".order-card");
    card.classList.toggle("expanded");
    detailButton.textContent = card.classList.contains("expanded") ? "Хураах" : "Дэлгэрэнгүй";
  }

  if (reorderButton) {
    const order = orders.find(item => item.id === reorderButton.dataset.reorder);
    try {
      reorderButton.disabled = true;
      for (const item of order.items || []) {
        if (item.variant_id) await addVariantToCart(user.id, item.variant_id, item.quantity);
      }
      reorderButton.textContent = "Сагсанд нэмэгдлээ ✓";
    } catch (error) {
      alert(`Дахин захиалахад алдаа гарлаа: ${error.message}`);
      reorderButton.disabled = false;
    }
  }
});

function statusText(status) {
  return {
    pending: "Хүлээгдэж буй",
    confirmed: "Баталгаажсан",
    shipping: "Хүргэлтэд гарсан",
    delivered: "Хүргэгдсэн",
    cancelled: "Цуцлагдсан"
  }[status] || status;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("mn-MN", { dateStyle: "medium" }).format(new Date(value));
}

loadOrders();
