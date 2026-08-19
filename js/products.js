// Нүүр хуудасны бараануудыг Supabase-аас бодитоор уншина.
import { supabase } from "./supabase.js";
import {
  addVariantToCart,
  fetchProducts,
  getCartCount,
  money,
  productImage,
  salePrice
} from "./store.js";

const state = {
  products: [],
  category: "all",
  gender: "all",
  collection: "all",
  search: "",
  sort: "featured"
};

const grid = document.querySelector("#productGrid");

// Supabase-аас бараануудыг уншаад нүүр хуудсанд зурна.
async function loadProducts() {
  grid.innerHTML = `<div class="empty-state">Бараануудыг уншиж байна...</div>`;
  try {
    state.products = await fetchProducts(true);
    render();
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Бараа уншихад алдаа гарлаа: ${error.message}</div>`;
  }
}

// Сонгосон ангилал, хүйс, хайлт болон эрэмбээр жагсаалтыг шүүнэ.
function filteredProducts() {
  const products = state.products.filter(product => {
    const categoryName = product.category?.name || "";
    const matchesCategory = state.category === "all" || categoryName === state.category;
    // Unisex хувцас нь эмэгтэй, эрэгтэй аль алинд тохирох тул хоёр цэсэнд хоёуланд нь харуулна.
    const productGender = (product.gender || "").trim().toLowerCase();
    const selectedGender = state.gender.toLowerCase();
    const matchesGender = state.gender === "all"
      || productGender === selectedGender
      || productGender === "unisex";
    // Хямдрал дээр хямдарсан барааг, Шинэ дээр сүүлийн 30 хоногт нэмэгдсэнийг харуулна.
    const createdAt = new Date(product.created_at);
    const newProductLimit = new Date();
    newProductLimit.setDate(newProductLimit.getDate() - 30);
    const matchesCollection = state.collection === "sale"
      ? Number(product.discount_price) > 0
      : state.collection === "new"
        ? !Number.isNaN(createdAt.getTime()) && createdAt >= newProductLimit
        : true;
    const matchesSearch = product.name.toLowerCase().includes(state.search);
    return matchesCategory && matchesGender && matchesCollection && matchesSearch;
  });

  if (state.sort === "low") products.sort((a, b) => salePrice(a) - salePrice(b));
  if (state.sort === "high") products.sort((a, b) => salePrice(b) - salePrice(a));
  if (state.collection === "new" && state.sort === "featured") {
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return products;
}

// Supabase-аас ирсэн барааны картыг HTML болгон харуулна.
function render() {
  const products = filteredProducts();
  document.querySelector("#resultCount").textContent = products.length;

  grid.innerHTML = products.length
    ? products.map(product => {
        const image = productImage(product);
        const primaryVariant = product.variants?.[0];
        const color = primaryVariant?.color_code || "#68745e";
        return `<article class="product-card">
          <a
            class="product-image ${image ? "has-photo" : ""}"
            style="--product-color:${color};${image ? `background-image:url('${image}')` : ""}"
            href="product.html?id=${product.id}"
          ></a>
          <button class="quick-add" data-product-id="${product.id}">
            Сагсанд нэмэх
          </button>
          <div class="product-info">
            <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
            <div class="product-meta">
              <span class="price">
                ${money(salePrice(product))}
                ${product.discount_price ? `<span class="old-price">${money(product.price)}</span>` : ""}
              </span>
            </div>
            <div class="swatches">
              ${(product.variants || []).slice(0, 3).map(variant =>
                `<i style="background:${variant.color_code || "#68745e"}"></i>`
              ).join("")}
            </div>
          </div>
        </article>`;
      }).join("")
    : `<div class="empty-state">Одоогоор бараа байхгүй байна.</div>`;
}

// Ангиллын товч болон radio сонголтыг ажиллуулна.
document.querySelectorAll("[data-category], input[name=filterCategory]").forEach(element => {
  element.addEventListener("click", () => {
    state.category = element.dataset.category || element.value;
    document.querySelectorAll(".category").forEach(category =>
      category.classList.toggle("active", category.dataset.category === state.category)
    );
    render();
  });
});

document.querySelector("#searchInput").addEventListener("input", event => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});

document.querySelector("#sortSelect").addEventListener("change", event => {
  state.sort = event.target.value;
  render();
});

document.querySelector("#filterButton").addEventListener("click", () =>
  document.querySelector("#filters").classList.toggle("open")
);

// Нүүр хуудасны цэсээр хүйс, шинэ болон хямдралтай барааг шүүнэ.
document.querySelectorAll("[data-nav-filter]").forEach(link => {
  link.addEventListener("click", () => {
    const value = link.dataset.navFilter;
    state.category = "all";
    state.gender = ["Эмэгтэй", "Эрэгтэй"].includes(value) ? value : "all";
    state.collection = ["sale", "new"].includes(value) ? value : "all";
    state.sort = "featured";
    document.querySelector("#sortSelect").value = "featured";
    document.querySelectorAll("[data-nav-filter]").forEach(item =>
      item.classList.toggle("active", item === link)
    );
    render();
  });
});

// Түргэн нэмэх товч бодит product_variants болон cart_items хүснэгт ашиглана.
document.addEventListener("click", async event => {
  const button = event.target.closest(".quick-add");
  if (!button) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = "login.html";
    return;
  }

  const product = state.products.find(item => item.id === button.dataset.productId);
  const variant = product?.variants?.find(item => item.stock > 0) || product?.variants?.[0];
  if (!variant) {
    showToast("Энэ бараанд размер, өнгөний хувилбар нэмээгүй байна.");
    return;
  }

  try {
    button.disabled = true;
    await addVariantToCart(user.id, variant.id, 1);
    document.querySelector("#cartCount").textContent = await getCartCount(user.id);
    button.textContent = "Нэмэгдлээ ✓";
    showToast("Бараа сагсанд нэмэгдлээ.");
  } catch (error) {
    showToast(`Сагсанд нэмэхэд алдаа гарлаа: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});

// Өнгөний дугуй дээр дарахад зураггүй барааны дүрслэлийн өнгийг солино.
document.addEventListener("click", event => {
  const swatch = event.target.closest(".swatches i");
  if (!swatch) return;
  const card = swatch.closest(".product-card");
  card.querySelector(".product-image").style.setProperty(
    "--product-color",
    getComputedStyle(swatch).backgroundColor
  );
});

// Newsletter нь тусдаа хүснэгтгүй тул зөвхөн формын төлөвийг харуулна.
document.querySelector("#newsletterForm").addEventListener("submit", event => {
  event.preventDefault();
  document.querySelector("#newsletterMessage").textContent =
    "Newsletter хүснэгт үүсгэсний дараа энэ мэдээлэл хадгалагдана.";
});

function showToast(text) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// Нэвтэрсэн хэрэглэгчийн бодит сагсны тоог харуулна.
async function loadCartCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    document.querySelector("#cartCount").textContent = await getCartCount(user.id);
  } catch (error) {
    console.error(error);
  }
}

loadProducts();
loadCartCount();
