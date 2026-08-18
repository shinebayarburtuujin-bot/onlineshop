// Сагсны мэдээллийг Supabase cart_items хүснэгтээс бодитоор удирдана.
import { supabase } from "./supabase.js";
import { fetchCart, money, productImage, requireUser, salePrice } from "./store.js";

const cartItemsElement = document.querySelector("#cartItems");
let user = null;
let cart = [];

// Нэвтэрсэн хэрэглэгчийн сагсыг Supabase-аас уншина.
async function loadCart() {
  user = await requireUser();
  if (!user) return;

  try {
    cartItemsElement.innerHTML = `<div class="cart-empty">Сагсыг уншиж байна...</div>`;
    cart = await fetchCart(user.id);
    renderCart();
  } catch (error) {
    cartItemsElement.innerHTML = `<div class="cart-empty">Алдаа: ${error.message}</div>`;
  }
}

// Сагсны бараа болон төлбөрийн дүнг дахин зурна.
function renderCart() {
  cartItemsElement.innerHTML = cart.length
    ? cart.map(item => {
        const variant = item.variant;
        const product = variant?.product;
        const price = salePrice(product);
        const image = productImage(product);
        return `<div class="cart-row">
          <div class="cart-product">
            <span class="cart-thumb" ${image ? `style="background-image:url('${image}')"` : ""}></span>
            <div>
              <b>${product?.name || "Устсан бараа"}</b>
              <p>Өнгө: ${variant?.color || "-"} · Размер: ${variant?.size || "-"}</p>
              <button class="remove" data-remove="${item.id}">Устгах</button>
            </div>
          </div>
          <span>${money(price)}</span>
          <div class="cart-qty">
            <button data-minus="${item.id}">−</button>
            <span>${item.quantity}</span>
            <button data-plus="${item.id}">+</button>
          </div>
          <b>${money(price * item.quantity)}</b>
        </div>`;
      }).join("")
    : `<div class="cart-empty">
        <h2>Таны сагс хоосон байна</h2>
        <a href="index.html#shop">Бараа үзэх →</a>
      </div>`;

  const subtotal = cart.reduce((sum, item) =>
    sum + salePrice(item.variant?.product) * item.quantity, 0
  );
  const shipping = subtotal > 0 && subtotal < 150000 ? 8000 : 0;

  document.querySelector("#subtotal").textContent = money(subtotal);
  document.querySelector("#shipping").textContent = shipping ? money(shipping) : "Үнэгүй";
  document.querySelector("#total").textContent = money(subtotal + shipping);
  document.querySelector("#cartCount").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Тоо нэмэх, хасах болон устгах үйлдлийг Supabase-д хадгална.
document.addEventListener("click", async event => {
  const itemId = event.target.dataset.plus || event.target.dataset.minus || event.target.dataset.remove;
  if (!itemId) return;
  const item = cart.find(cartItem => cartItem.id === itemId);
  if (!item) return;

  try {
    if (event.target.dataset.remove) {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
    } else {
      const nextQuantity = event.target.dataset.plus
        ? item.quantity + 1
        : Math.max(1, item.quantity - 1);
      if (nextQuantity > (item.variant?.stock || 0)) {
        alert("Барааны үлдэгдэл хүрэлцэхгүй байна.");
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: nextQuantity })
        .eq("id", itemId);
      if (error) throw error;
    }
    cart = await fetchCart(user.id);
    renderCart();
  } catch (error) {
    alert(`Сагс шинэчлэхэд алдаа гарлаа: ${error.message}`);
  }
});

loadCart();
