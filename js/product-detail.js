// Барааны дэлгэрэнгүй мэдээлэл болон сонголтыг Supabase-аас ажиллуулна.
import { supabase } from "./supabase.js";
import {
  addVariantToCart,
  fetchProduct,
  getCartCount,
  money,
  productImage,
  salePrice
} from "./store.js";

const productId = new URLSearchParams(location.search).get("id");
let product = null;
let quantity = 1;
let selectedVariant = null;

// Product ID-аар барааны мэдээлэл, зураг, variant-уудыг уншина.
async function loadProduct() {
  if (!productId) {
    location.href = "index.html#shop";
    return;
  }

  try {
    product = await fetchProduct(productId);
    selectedVariant = product.variants?.find(variant => variant.stock > 0) || product.variants?.[0] || null;
    renderProduct();
    await loadCartCount();
  } catch (error) {
    document.querySelector(".detail-info").innerHTML =
      `<p>Бараа уншихад алдаа гарлаа: ${error.message}</p>`;
  }
}

// Supabase-аас ирсэн утгуудыг бүтээгдэхүүний хуудсанд байрлуулна.
function renderProduct() {
  document.querySelector("#productName").textContent = product.name;
  document.querySelector("#crumbName").textContent = product.name;
  document.querySelector("#productPrice").textContent = money(salePrice(product));
  document.querySelector(".description").textContent = product.description || "Тайлбар оруулаагүй байна.";

  const images = product.images || [];
  const mainImage = productImage(product);
  const detailImage = document.querySelector(".detail-image");
  if (mainImage) {
    detailImage.style.backgroundImage = `url('${mainImage}')`;
    detailImage.style.backgroundSize = "cover";
    detailImage.style.backgroundPosition = "center";
    detailImage.classList.add("has-photo");
  }

  const thumbnailArea = document.querySelector(".thumbnails");
  thumbnailArea.innerHTML = images.length
    ? images.map((image, index) =>
        `<button
          class="${index === 0 ? "selected" : ""} has-photo"
          style="background-image:url('${image.image_url}')"
          data-image="${image.image_url}"
          aria-label="Зураг ${index + 1}"
        ></button>`
      ).join("")
    : `<button class="selected" aria-label="Зураг байхгүй"></button>`;

  renderVariants();
}

// Өнгө болон размерын сонголтыг product_variants хүснэгтээс үүсгэнэ.
function renderVariants() {
  const variants = product.variants || [];
  const colors = [...new Map(variants.map(variant => [variant.color, variant])).values()];
  // Үлдэгдэлтэй variant бүрийн size-ийг тусдаа сонгох товч болгон харуулна.
  const sizes = [...new Set(
    variants
      .filter(variant => variant.stock > 0)
      .map(variant => variant.size)
      .filter(Boolean)
  )];

  document.querySelector(".color-options").innerHTML = colors.map(variant =>
    `<button
      class="${selectedVariant?.color === variant.color ? "selected" : ""}"
      style="background:${variant.color_code || "#68745e"}"
      data-color="${variant.color || ""}"
      aria-label="${variant.color || "Өнгө"}"
    ></button>`
  ).join("");

  document.querySelector(".detail-sizes").innerHTML = sizes.map(size =>
    `<button class="${selectedVariant?.size === size ? "selected" : ""}" data-size="${size}">
      ${size}
    </button>`
  ).join("");

  document.querySelector("#selectedColor").textContent = selectedVariant?.color || "Сонголтгүй";
}

// Өнгө эсвэл размер өөрчлөгдөхөд тохирох variant-ийг сонгоно.
function selectVariant(changes) {
  const wantedColor = changes.color || selectedVariant?.color;
  const wantedSize = changes.size || selectedVariant?.size;
  selectedVariant = product.variants?.find(variant =>
    variant.color === wantedColor && variant.size === wantedSize
  ) || product.variants?.find(variant =>
    changes.color ? variant.color === wantedColor : variant.size === wantedSize
  ) || selectedVariant;
  renderVariants();
}

document.querySelector("#plus").onclick = () => {
  quantity += 1;
  document.querySelector("#quantity").textContent = quantity;
};

document.querySelector("#minus").onclick = () => {
  quantity = Math.max(1, quantity - 1);
  document.querySelector("#quantity").textContent = quantity;
};

document.querySelector(".color-options").onclick = event => {
  const button = event.target.closest("button[data-color]");
  if (button) selectVariant({ color: button.dataset.color });
};

document.querySelector(".detail-sizes").onclick = event => {
  const button = event.target.closest("button[data-size]");
  if (button) selectVariant({ size: button.dataset.size });
};

document.querySelector(".thumbnails").onclick = event => {
  const button = event.target.closest("button[data-image]");
  if (!button) return;
  document.querySelector(".detail-image").style.backgroundImage = `url('${button.dataset.image}')`;
  document.querySelectorAll(".thumbnails button").forEach(item =>
    item.classList.toggle("selected", item === button)
  );
};

document.querySelector(".option a").onclick = event => {
  event.preventDefault();
  alert("XS: 42–44 · S: 44–46 · M: 46–48 · L: 48–50 · XL: 50–52");
};

// Сонгосон бодит variant-ийг cart_items хүснэгтэд хадгална.
document.querySelector("#addToCart").onclick = async event => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = "login.html";
    return;
  }
  if (!selectedVariant) {
    alert("Энэ бараанд өнгө, размерын хувилбар нэмээгүй байна.");
    return;
  }
  if (selectedVariant.stock < quantity) {
    alert(`Үлдэгдэл хүрэлцэхгүй байна. Одоогийн үлдэгдэл: ${selectedVariant.stock}`);
    return;
  }

  try {
    event.currentTarget.disabled = true;
    await addVariantToCart(user.id, selectedVariant.id, quantity);
    await loadCartCount();
    event.currentTarget.textContent = "Сагсанд нэмэгдлээ ✓";
  } catch (error) {
    alert(`Сагсанд нэмэхэд алдаа гарлаа: ${error.message}`);
  } finally {
    event.currentTarget.disabled = false;
  }
};

async function loadCartCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) document.querySelector("#cartCount").textContent = await getCartCount(user.id);
}

loadProduct();
