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
  document.querySelector("#additionalColors").innerHTML = "";
  document.querySelector("#editProductId").value = "";
  document.querySelector("#productFormTitle").textContent = "Шинэ бараа";
  selectedFile = null;
  currentImageUrl = "";
  showImagePreview("");
  showProductFormMessage("");
  // Анхны сонгогдсон category Accessories бол размергүй горимыг санал болгоно.
  applyCategorySizeMode();
  dialog.showModal();
};

document.querySelector("#closeProductForm").onclick = () => dialog.close();

// Product, үндсэн variant болон зургийг Supabase-д дарааллаар хадгална.
document.querySelector("#productForm").onsubmit = async event => {
  event.preventDefault();
  const saveButton = document.querySelector("#saveProductButton");
  let saveStep = "барааны үндсэн мэдээлэл";
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
    saveButton.disabled = true;
    saveButton.textContent = "Хадгалж байна...";
    showProductFormMessage("");
    showMessage("Барааг хадгалж байна...");
    const query = id
      ? supabase.from("products").update(productValue).eq("id", id).select("id").single()
      : supabase.from("products").insert(productValue).select("id").single();
    const { data: savedProduct, error: productError } = await query;
    if (productError) throw productError;

    saveStep = "размер, өнгө болон үлдэгдэл";
    await saveProductVariants(savedProduct.id);

    saveStep = "барааны зураг";
    const primaryColor = document.querySelector("[data-primary-color] .variant-color").value.trim();
    if (selectedFile) await uploadProductImage(savedProduct.id, selectedFile, primaryColor, true);
    else if (!currentImageUrl && id) {
      const { error: imageDeleteError } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", savedProduct.id);
      if (imageDeleteError) throw imageDeleteError;
    }

    // Нэмэлт өнгө бүрд сонгосон зургийг тухайн өнгийн нэртэй холбон хадгална.
    for (const group of document.querySelectorAll(".additional-color-group")) {
      const file = group.querySelector(".variant-image")?.files[0];
      if (!file) continue;
      await uploadProductImage(
        savedProduct.id,
        file,
        group.querySelector(".variant-color").value.trim(),
        false
      );
    }

    showProductFormMessage("Бараа амжилттай хадгалагдлаа.", true);
    await loadAdminData();
    showMessage("Бараа Supabase-д амжилттай хадгалагдлаа.");
    setTimeout(() => dialog.close(), 500);
  } catch (error) {
    const errorText = `${saveStep} хадгалахад алдаа гарлаа: ${error.message}`;
    showProductFormMessage(errorText);
    showMessage(errorText);
    console.error("Бараа хадгалах алдаа:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Хадгалах";
  }
};

// Нэг өнгөний бүлгээс сонгосон размер болон үлдэгдлүүдийг уншина.
function getEnteredSizes(group) {
  // Размергүй бараанд cart-д ашиглах нэг variant-ийг One Size техникийн утгаар үүсгэнэ.
  if (group.querySelector(".variant-no-size").checked) {
    return [{
      size: "One Size",
      stock: Number(group.querySelector(".variant-no-size-stock").value)
    }];
  }

  return [...group.querySelectorAll(".size-stock-list label")]
    .filter(row => row.querySelector(".size-enabled").checked)
    .map(row => ({
      size: row.querySelector(".size-enabled").value,
      stock: Number(row.querySelector(".size-stock").value)
    }));
}

// Формд байгаа бүх өнгө болон өнгө тус бүрийн size-ийг variant жагсаалт болгоно.
function getEnteredVariants(productId) {
  return [...document.querySelectorAll(".color-variant-group")].flatMap(group => {
    const color = group.querySelector(".variant-color").value.trim();
    const colorCode = group.querySelector(".variant-color-code").value;
    const sizes = getEnteredSizes(group);
    if (!color) throw new Error("Өнгө бүрийн нэрийг оруулна уу.");
    if (!sizes.length) throw new Error(`${color} өнгөнд размер сонгох эсвэл ‘Размергүй бараа’-г идэвхжүүлнэ үү.`);

    return sizes.map(({ size, stock }) => ({
      product_id: productId,
      size,
      color,
      color_code: colorCode,
      stock,
      sku: `${productId}-${size === "One Size" ? "no-size" : size}-${color}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
    }));
  });
}

// Өнгө-size бүрийг product_variants хүснэгтэд бие даасан мөр болгон хадгална.
async function saveProductVariants(productId) {
  const enteredVariants = getEnteredVariants(productId);
  const existingVariants = products.find(product => product.id === productId)?.variants || [];
  const usedVariantIds = new Set();

  // Өмнөх variant-ийг ижил өнгө болон size-аар нь олж update хийнэ, байхгүй бол шинээр үүсгэнэ.
  for (const variantValue of enteredVariants) {
    const existingVariant = existingVariants.find(variant =>
      !usedVariantIds.has(variant.id)
      && variant.color === variantValue.color
      && variant.size === variantValue.size
    );
    const request = existingVariant
      ? supabase.from("product_variants").update(variantValue).eq("id", existingVariant.id)
      : supabase.from("product_variants").insert(variantValue);
    const { error } = await request;
    if (error) throw error;
    if (existingVariant) usedVariantIds.add(existingVariant.id);
  }

  // Формоос хассан хуучин өнгө/размер захиалгын түүхтэй байж болох тул устгахгүй, stock-ийг 0 болгоно.
  const unusedVariantIds = existingVariants
    .filter(variant => !usedVariantIds.has(variant.id))
    .map(variant => variant.id);
  if (unusedVariantIds.length) {
    const { error } = await supabase
      .from("product_variants")
      .update({ stock: 0 })
      .in("id", unusedVariantIds);
    if (error) throw error;
  }
}

// Зургийг product-images bucket-д upload хийгээд URL-г product_images-д хадгална.
async function uploadProductImage(productId, file, color = null, isPrimary = false) {
  const extension = file.name.split(".").pop().toLowerCase();
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  if (isPrimary) {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  }
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    image_url: data.publicUrl,
    color,
    is_primary: isPrimary,
    sort_order: isPrimary ? 0 : 1
  });
  if (error) throw error;
}

document.querySelector("#adminProducts").onclick = async event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) openEditForm(products.find(product => product.id === editId));
  if (deleteId && confirm("Энэ барааг Supabase-аас устгах уу?")) {
    await deleteProduct(deleteId);
  }
};

// Product нь variant болон зурагтай foreign key холбоотой учраас хүүхэд мөрүүдийг эхэлж устгана.
// Ингэснээр product_variants_product_id_fkey constraint-ийн алдаа гарахгүй.
async function deleteProduct(productId) {
  showMessage("Барааны холбоотой мэдээллийг шалгаж байна...");

  try {
    // Устгах барааны бүх variant ID-г эхлээд авна.
    const { data: variants, error: variantReadError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);
    if (variantReadError) throw variantReadError;

    const variantIds = (variants || []).map(variant => variant.id);

    // Variant сагсанд байгаа бол тэдгээр түр сагсны мөрүүдийг эхэлж цэвэрлэнэ.
    if (variantIds.length) {
      const { error: cartError } = await supabase
        .from("cart_items")
        .delete()
        .in("variant_id", variantIds);
      if (cartError) throw cartError;

      // Захиалгын түүх тухайн variant-ийг ашигласан эсэхийг шалгана.
      const { data: orderedItems, error: orderCheckError } = await supabase
        .from("order_items")
        .select("id")
        .in("variant_id", variantIds)
        .limit(1);
      if (orderCheckError) throw orderCheckError;

      // Түүхтэй барааг устгавал өмнөх захиалга эвдрэх тул зөвхөн каталогоос нууна.
      if (orderedItems?.length) {
        const { error: hideError } = await supabase
          .from("products")
          .update({ is_active: false })
          .eq("id", productId);
        if (hideError) throw hideError;

        await loadAdminData();
        showMessage("Энэ бараа захиалгын түүхтэй тул устгаагүй, каталогоос нуусан.");
        return;
      }
    }

    // Product ID-тай холбоотой зураг болон review мөрүүдийг цэвэрлэнэ.
    const { error: imageError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);
    if (imageError) throw imageError;

    const { error: reviewError } = await supabase
      .from("reviews")
      .delete()
      .eq("product_id", productId);
    if (reviewError) throw reviewError;

    // Хамааралгүй болсон variant мөрүүдийг устгана.
    const { error: variantDeleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);
    if (variantDeleteError) throw variantDeleteError;

    // Эцэст нь үндсэн products мөрийг устгана.
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    if (productError) throw productError;

    await loadAdminData();
    showMessage("Бараа болон холбоотой мэдээлэл амжилттай устгагдлаа.");
  } catch (error) {
    showMessage(`Устгахад алдаа гарлаа: ${error.message}`);
    console.error("Бараа устгах алдаа:", error);
  }
}

function openEditForm(product) {
  const activeVariants = (product.variants || []).filter(variant => variant.stock > 0);
  const variantsForForm = activeVariants.length ? activeVariants : (product.variants || []).slice(0, 1);
  const variantGroups = [...new Map(
    variantsForForm.map(variant => [
      `${variant.color || ""}|${variant.color_code || ""}`,
      variantsForForm.filter(item =>
        item.color === variant.color && item.color_code === variant.color_code
      )
    ])
  ).values()];
  const primaryVariants = variantGroups[0] || [];
  document.querySelector("#editProductId").value = product.id;
  document.querySelector("#adminProductName").value = product.name;
  document.querySelector("#adminCategory").value = product.category_id || "";
  document.querySelector("#adminGender").value = product.gender || "Unisex";
  document.querySelector("#adminProductPrice").value = product.price;
  document.querySelector("#adminDiscountPrice").value = product.discount_price || "";
  document.querySelector("#adminDescription").value = product.description || "";
  document.querySelector("#adminMaterial").value = product.material || "";
  document.querySelector("#additionalColors").innerHTML = "";
  fillColorGroup(document.querySelector("[data-primary-color]"), primaryVariants);
  variantGroups.slice(1).forEach(variants => addColorGroup(variants));
  document.querySelector("#adminProductActive").checked = product.is_active;
  currentImageUrl = productImage(product);
  selectedFile = null;
  showProductFormMessage("");
  showImagePreview(currentImageUrl);
  document.querySelector("#productFormTitle").textContent = "Бараа засах";
  dialog.showModal();
}

// Размергүй горимд size сонголтуудыг хааж, нийт үлдэгдлийн талбарыг харуулна.
function setNoSizeMode(enabled, group = document.querySelector("[data-primary-color]")) {
  group.querySelector(".size-stock-list").classList.toggle("disabled", enabled);
  group.querySelector(".no-size-stock").classList.toggle("hidden", !enabled);
  group.querySelectorAll(".size-enabled, .size-stock").forEach(input => {
    input.disabled = enabled;
  });
}

// Database-аас ирсэн нэг өнгийн variant-уудыг тухайн формын бүлэгт байрлуулна.
function fillColorGroup(group, variants = []) {
  const first = variants[0] || {};
  group.querySelector(".variant-color").value = first.color || "Sage green";
  group.querySelector(".variant-color-code").value = first.color_code || "#66735a";
  group.querySelectorAll(".size-stock-list label").forEach(row => {
    const size = row.querySelector(".size-enabled").value;
    const variant = variants.find(item => item.size === size);
    row.querySelector(".size-enabled").checked = Boolean(variant && variant.stock > 0);
    row.querySelector(".size-stock").value = variant?.stock ?? 0;
  });
  const noSizeVariant = variants.find(item => !item.size || item.size === "One Size");
  group.querySelector(".variant-no-size").checked = Boolean(noSizeVariant);
  group.querySelector(".variant-no-size-stock").value = noSizeVariant?.stock ?? 1;
  setNoSizeMode(Boolean(noSizeVariant), group);
}

// Нэмэлт өнгөний нэр, код, size болон үлдэгдлийн формыг үүсгэнэ.
function addColorGroup(variants = []) {
  const container = document.querySelector("#additionalColors");
  container.insertAdjacentHTML("beforeend", `
    <section class="color-variant-group additional-color-group">
      <div class="additional-color-head">
        <b>Нэмэлт өнгө</b>
        <button class="remove-color-button" type="button">Өнгө хасах</button>
      </div>
      <div class="modal-grid">
        <label>Өнгөний нэр<input class="variant-color" type="text" required></label>
        <label>Өнгөний код<input class="variant-color-code" type="color" value="#66735a"></label>
      </div>
      <label>
        Энэ өнгийн зураг (сонголттой)
        <input class="variant-image" type="file" accept="image/png,image/jpeg,image/webp">
      </label>
      <fieldset class="size-stock-fieldset">
        <label class="no-size-option">
          <input class="variant-no-size" type="checkbox"> Размергүй бараа
        </label>
        <label class="no-size-stock hidden">
          Нийт үлдэгдэл<input class="variant-no-size-stock" type="number" min="0" value="1">
        </label>
        <div class="size-stock-list">
          ${["XS", "S", "M", "L", "XL", "XXL"].map(size => `
            <label>
              <input class="size-enabled" type="checkbox" value="${size}"> ${size}
              <input class="size-stock" type="number" min="0" value="0" aria-label="${size} үлдэгдэл">
            </label>
          `).join("")}
        </div>
      </fieldset>
    </section>
  `);
  fillColorGroup(container.lastElementChild, variants);
}

// Accessories сонгогдоход размергүй горимыг автоматаар асаана, хэрэглэгч өөрөө сольж болно.
function applyCategorySizeMode() {
  const categoryId = document.querySelector("#adminCategory").value;
  const category = categories.find(item => item.id === categoryId);
  const noSize = category?.name?.trim().toLowerCase() === "accessories";
  document.querySelector("#adminNoSize").checked = noSize;
  setNoSizeMode(noSize);
}

document.querySelector("#addColorButton").onclick = () => addColorGroup();

document.querySelector("#productForm").addEventListener("change", event => {
  if (event.target.matches(".variant-no-size")) {
    setNoSizeMode(event.target.checked, event.target.closest(".color-variant-group"));
  }
  if (event.target.matches(".variant-image") && event.target.files[0]?.size > 2 * 1024 * 1024) {
    alert("Өнгөний зураг 2MB-аас бага байх шаардлагатай.");
    event.target.value = "";
  }
});

document.querySelector("#additionalColors").onclick = event => {
  const removeButton = event.target.closest(".remove-color-button");
  if (removeButton) removeButton.closest(".color-variant-group").remove();
};

document.querySelector("#adminCategory").onchange = applyCategorySizeMode;

// Modal дотор хадгалалтын мэдээллийг өнгөтэй, хэрэглэгчид шууд харагдахаар үзүүлнэ.
function showProductFormMessage(text, success = false) {
  const message = document.querySelector("#productFormMessage");
  message.textContent = text;
  message.className = text
    ? `product-form-message ${success ? "success" : "visible"}`
    : "product-form-message";
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
