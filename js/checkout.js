// Checkout нь Supabase cart_items-ээс уншиж orders, order_items хүснэгтэд хадгална.
import { supabase } from "./supabase.js";
import { fetchCart, money, requireUser, salePrice } from "./store.js";

let user = null;
let cart = [];
let total = 0;

// Нэвтэрсэн хэрэглэгчийн сагс болон профайлын мэдээллийг уншина.
async function initializeCheckout() {
  user = await requireUser();
  if (!user) return;

  try {
    cart = await fetchCart(user.id);
    renderSummary();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      document.querySelector("#checkoutName").value = profile.full_name || "";
      document.querySelector("#checkoutPhone").value = profile.phone || "";
      document.querySelector("#checkoutAddress").value = profile.address || "";
    }
  } catch (error) {
    showMessage(`Мэдээлэл уншихад алдаа гарлаа: ${error.message}`);
  }
}

// Баруун талын бодит сагсны хураангуйг зурна.
function renderSummary() {
  const subtotal = cart.reduce((sum, item) =>
    sum + salePrice(item.variant?.product) * item.quantity, 0
  );
  const shipping = subtotal > 0 && subtotal < 150000 ? 8000 : 0;
  total = subtotal + shipping;

  document.querySelector("#checkoutItems").innerHTML = cart.length
    ? cart.map(item => {
        const product = item.variant?.product;
        return `<div class="checkout-item">
          <span>${product?.name || "Бараа"} × ${item.quantity}</span>
          <b>${money(salePrice(product) * item.quantity)}</b>
        </div>`;
      }).join("")
    : `<p>Сагс хоосон байна.</p>`;
  document.querySelector("#checkoutTotal").textContent = money(total);
}

// Форм илгээгдэхэд үндсэн захиалга болон барааны мөрүүдийг Supabase-д үүсгэнэ.
document.querySelector("#checkoutForm").onsubmit = async event => {
  event.preventDefault();
  if (!cart.length) {
    showMessage("Сагс хоосон байна.");
    return;
  }

  const button = event.submitter;
  button.disabled = true;
  showMessage("Захиалгыг хадгалж байна...");

  const orderNumber = `ORD-${Date.now()}`;
  const orderValue = {
    user_id: user.id,
    order_number: orderNumber,
    total_amount: total,
    delivery_address: document.querySelector("#checkoutAddress").value.trim(),
    phone: document.querySelector("#checkoutPhone").value.trim(),
    payment_method: new FormData(event.target).get("payment"),
    payment_status: "pending",
    order_status: "pending"
  };

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderValue)
      .select("id, order_number")
      .single();
    if (orderError) throw orderError;

    const orderItems = cart.map(item => {
      const variant = item.variant;
      const product = variant.product;
      const unitPrice = salePrice(product);
      return {
        order_id: order.id,
        variant_id: variant.id,
        product_name: product.name,
        size: variant.size,
        color: variant.color,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity
      };
    });

    const { error: itemError } = await supabase.from("order_items").insert(orderItems);
    if (itemError) throw itemError;

    const { error: clearError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);
    if (clearError) throw clearError;

    showMessage(`Захиалга амжилттай: ${order.order_number}`, true);
    setTimeout(() => location.href = "orders.html", 900);
  } catch (error) {
    showMessage(`Захиалга хадгалахад алдаа гарлаа: ${error.message}`);
    button.disabled = false;
  }
};

function showMessage(text, success = false) {
  const message = document.querySelector("#checkoutMessage");
  message.textContent = text;
  message.style.color = success ? "var(--sage)" : "var(--sale)";
}

initializeCheckout();
