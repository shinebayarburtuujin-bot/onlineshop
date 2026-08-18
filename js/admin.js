// Админ хуудасны бараа, зураг, variant болон захиалгыг Supabase-аар удирдана.
import { supabase } from "./supabase.js";
import { fetchProducts, money, productImage, requireUser } from "./store.js";

const dialog = document.querySelector("#productDialog");
let products = [];
let orders = [];
let categories = [];
let selectedFile = null;
let currentImageUrl = "";

// Админ эрхийг profiles.role утгаар шалгаж бүх бодит өгөгдлийг уншина.
async function initializeAdmin() {
  const user = await requireUser();
  if (!user) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    alert("Энэ хуудас зөвхөн admin эрхтэй хэрэглэгчид нээлттэй.");
    location.href = "index.html";
    return;
  }

  await Promise.all([loadCategories(), loadAdminData()]);
}

async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw error;
  categories = data || [];
  document.querySelector("#adminCategory").innerHTML = categories.length
    ? categories.map(category => `<option value="${category.id}">${category.name}</option>`).join("")
    : `<option value="">Эхлээд category нэмнэ үү</option>`;
}

async function loadAdminData() {
  showMessage("Өгөгдлийг уншиж байна...");
  try {
    const [productData, orderResult] = await Promise.all([
      fetchProducts(false),
      supabase.from("orders").select("*, items:order_items(*)").order("created_at", { ascending: false })
    ]);
    if (orderResult.error) throw orderResult.error;
    products = productData;
    orders = orderResult.data || [];
    renderAdmin();
    showMessage("");
  } catch (error) {
    showMessage(`Өгөгдөл уншихад алдаа гарлаа: ${error.message}`);
  }
}

// Sidebar-ийн сонгосон panel-ийг харуулна.
document.querySelectorAll("[data-admin-tab]").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll("[data-admin-tab]").forEach(item =>
      item.classList.toggle("active", item === button)
    );
    document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.remove("active"));
    document.querySelector(`#${button.dataset.adminTab}Panel`).classList.add("active");
    document.querySelector("#adminTitle").textContent = button.textContent.trim();
  };
});

function renderAdmin() {
  document.querySelector("#productStat").textContent = products.length;
  document.querySelector("#orderStat").textContent = orders.length;
  document.querySelector("#revenueStat").textContent = money(
    orders.filter(order => order.payment_status === "paid")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)
  );
  document.querySelector("#stockStat").textContent = products.filter(product =>
    (product.variants || []).some(variant => variant.stock < 5)
  ).length;
  renderProducts();
  renderOrders();
}

function renderProducts(search = "") {
  const result = products.filter(product => product.name.toLowerCase().includes(search.toLowerCase()));
  document.querySelector("#adminProducts").innerHTML = result.length
    ? result.map(product => `<tr>
        <td><div class="admin-product-cell">
          <span class="admin-product-thumb" ${productImage(product) ? `style="background-image:url('${productImage(product)}')"` : ""}></span>
          <b>${product.name}</b>
        </div></td>
        <td>${product.category?.name || "Ангилаагүй"}</td>
        <td>${money(product.price)}</td>
        <td><span class="status-pill">${product.is_active ? "Идэвхтэй" : "Нуусан"}</span></td>
        <td><div class="admin-actions">
          <button data-edit="${product.id}">Засах</button>
          <button data-delete="${product.id}">Устгах</button>
        </div></td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-admin">Бараа олдсонгүй.</td></tr>`;
}

function renderOrders() {
  const rows = orders.map(order => `<tr>
    <td>${order.order_number}</td>
    <td>${new Intl.DateTimeFormat("mn-MN").format(new Date(order.created_at))}</td>
    <td>${money(order.total_amount)}</td>
    <td><select class="order-status" data-order-id="${order.id}">
      <option value="pending" ${order.order_status === "pending" ? "selected" : ""}>Хүлээгдэж буй</option>
      <option value="confirmed" ${order.order_status === "confirmed" ? "selected" : ""}>Баталгаажсан</option>
      <option value="shipping" ${order.order_status === "shipping" ? "selected" : ""}>Хүргэлтэд гарсан</option>
      <option value="delivered" ${order.order_status === "delivered" ? "selected" : ""}>Хүргэгдсэн</option>
      <option value="cancelled" ${order.order_status === "cancelled" ? "selected" : ""}>Цуцлагдсан</option>
    </select></td>
  </tr>`).join("");
  document.querySelector("#adminOrders").innerHTML = rows || `<tr><td colspan="4">Захиалга байхгүй.</td></tr>`;
  document.querySelector("#recentOrders").innerHTML = `<table><tbody>${rows || "<tr><td>Захиалга байхгүй.</td></tr>"}</tbody></table>`;
}

// Компьютерээс сонгосон зургийг preview дээр харуулна.
document.querySelector("#adminProductImage").onchange = event => {
  selectedFile = event.target.files[0] || null;
  if (!selectedFile) return;
  if (selectedFile.size > 2 * 1024 * 1024) {
    alert("Зургийн хэмжээ 2MB-аас бага байх шаардлагатай.");
    selectedFile = null;
    event.target.value = "";
    return;
  }
  showImagePreview(URL.createObjectURL(selectedFile));
};

document.querySelector("#removeProductImage").onclick = () => {
  selectedFile = null;
  currentImageUrl = "";
  document.querySelector("#adminProductImage").value = "";
  showImagePreview("");
};

function showImagePreview(url) {
  const preview = document.querySelector("#adminImagePreview");
  preview.style.backgroundImage = url ? `url('${url}')` : "";
  preview.innerHTML = url ? "" : "<span>Зураг сонгоогүй</span>";
}

document.querySelector("#openProductForm").onclick = () => {
  document.querySelector("#productForm").reset();
  document.querySelector("#editProductId").value = "";
  document.querySelector("#productFormTitle").textContent = "Шинэ бараа";
  selectedFile = null;
  currentImageUrl = "";
  showImagePreview("");
  dialog.showModal();
};

document.querySelector("#closeProductForm").onclick = () => dialog.close();

// Product, үндсэн variant болон зургийг Supabase-д дарааллаар хадгална.
document.querySelector("#productForm").onsubmit = async event => {
  event.preventDefault();
  const id = document.querySelector("#editProductId").value;
  const productValue = {
    category_id: document.querySelector("#adminCategory").value || null,
    name: document.querySelector("#adminProductName").value.trim(),
    description: document.querySelector("#adminDescription").value.trim() || null,
    material: document.querySelector("#adminMaterial").value.trim() || null,
    gender: document.querySelector("#adminGender").value,
    price: Number(document.querySelector("#adminProductPrice").value),
    discount_price: Number(document.querySelector("#adminDiscountPrice").value) || null,
    is_active: document.querySelector("#adminProductActive").checked
  };

  try {
    showMessage("Барааг хадгалж байна...");
    const query = id
      ? supabase.from("products").update(productValue).eq("id", id).select("id").single()
      : supabase.from("products").insert(productValue).select("id").single();
    const { data: savedProduct, error: productError } = await query;
    if (productError) throw productError;

    const variantValue = {
      product_id: savedProduct.id,
      size: document.querySelector("#adminSize").value.trim(),
      color: document.querySelector("#adminColor").value.trim(),
      color_code: document.querySelector("#adminColorCode").value,
      stock: Number(document.querySelector("#adminStock").value),
      sku: `${savedProduct.id}-${document.querySelector("#adminSize").value}-${Date.now()}`
    };
    const oldVariant = products.find(product => product.id === savedProduct.id)?.variants?.[0];
    const variantQuery = oldVariant
      ? supabase.from("product_variants").update(variantValue).eq("id", oldVariant.id)
      : supabase.from("product_variants").insert(variantValue);
    const { error: variantError } = await variantQuery;
    if (variantError) throw variantError;

    if (selectedFile) await uploadProductImage(savedProduct.id, selectedFile);
    else if (!currentImageUrl && id) {
      await supabase.from("product_images").delete().eq("product_id", savedProduct.id);
    }

    dialog.close();
    await loadAdminData();
    showMessage("Бараа Supabase-д амжилттай хадгалагдлаа.");
  } catch (error) {
    showMessage(`Хадгалахад алдаа гарлаа: ${error.message}`);
  }
};

// Зургийг product-images bucket-д upload хийгээд URL-г product_images-д хадгална.
async function uploadProductImage(productId, file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    image_url: data.publicUrl,
    is_primary: true,
    sort_order: 0
  });
  if (error) throw error;
}

document.querySelector("#adminProducts").onclick = async event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) openEditForm(products.find(product => product.id === editId));
  if (deleteId && confirm("Энэ барааг Supabase-аас устгах уу?")) {
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    if (error) showMessage(`Устгахад алдаа гарлаа: ${error.message}`);
    else await loadAdminData();
  }
};

function openEditForm(product) {
  const variant = product.variants?.[0] || {};
  document.querySelector("#editProductId").value = product.id;
  document.querySelector("#adminProductName").value = product.name;
  document.querySelector("#adminCategory").value = product.category_id || "";
  document.querySelector("#adminGender").value = product.gender || "Unisex";
  document.querySelector("#adminProductPrice").value = product.price;
  document.querySelector("#adminDiscountPrice").value = product.discount_price || "";
  document.querySelector("#adminDescription").value = product.description || "";
  document.querySelector("#adminMaterial").value = product.material || "";
  document.querySelector("#adminSize").value = variant.size || "M";
  document.querySelector("#adminColor").value = variant.color || "Sage green";
  document.querySelector("#adminColorCode").value = variant.color_code || "#66735a";
  document.querySelector("#adminStock").value = variant.stock ?? 1;
  document.querySelector("#adminProductActive").checked = product.is_active;
  currentImageUrl = productImage(product);
  selectedFile = null;
  showImagePreview(currentImageUrl);
  document.querySelector("#productFormTitle").textContent = "Бараа засах";
  dialog.showModal();
}

document.querySelector("#adminSearch").oninput = event => renderProducts(event.target.value);

// Админ захиалгын төлөвийг өөрчлөхөд orders хүснэгтийг шинэчилнэ.
document.querySelector("#adminOrders").onchange = updateOrderStatus;
document.querySelector("#recentOrders").onchange = updateOrderStatus;
async function updateOrderStatus(event) {
  const select = event.target.closest("[data-order-id]");
  if (!select) return;
  const { error } = await supabase
    .from("orders")
    .update({ order_status: select.value })
    .eq("id", select.dataset.orderId);
  if (error) showMessage(`Төлөв шинэчлэхэд алдаа гарлаа: ${error.message}`);
  else showMessage("Захиалгын төлөв шинэчлэгдлээ.");
}

function showMessage(text) {
  document.querySelector("#adminMessage").textContent = text;
}

initializeAdmin();
