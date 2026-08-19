// Дэлгүүрийн Supabase өгөгдөлтэй ажиллах нийтлэг функцууд.
import { supabase } from "./supabase.js";

// Одоогоор нэвтэрсэн хэрэглэгчийг серверээс баталгаажуулж авна.
export async function requireUser(redirect = true) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (redirect) location.href = "login.html";
    return null;
  }
  return user;
}

// Products хүснэгтийг category, зураг, хувилбарын хамт уншина.
export async function fetchProducts(activeOnly = true) {
  let query = supabase
    .from("products")
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .order("created_at", { ascending: false });

  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Нэг барааг ID-аар дэлгэрэнгүй мэдээлэлтэй нь авна.
export async function fetchProduct(productId) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq("id", productId)
    .single();
  if (error) throw error;
  return data;
}

// Хэрэглэгчийн Supabase сагсыг барааны мэдээлэлтэй нь уншина.
export async function fetchCart(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      *,
      variant:product_variants(
        *,
        product:products(*, images:product_images(*))
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Сонгосон хувилбарыг сагсанд шинээр нэмэх эсвэл тоог нь өсгөнө.
export async function addVariantToCart(userId, variantId, quantity = 1) {
  const { data: existing, error: readError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("variant_id", variantId)
    .maybeSingle();
  if (readError) throw readError;

  const request = existing
    ? supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id)
    : supabase
        .from("cart_items")
        .insert({ user_id: userId, variant_id: variantId, quantity });

  const { error } = await request;
  if (error) throw error;
}

// Сагсны нийт барааны тоог header дээр харуулахад ашиглана.
export async function getCartCount(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).reduce((sum, item) => sum + item.quantity, 0);
}

// Тоог Монголын төгрөгийн форматтай текст болгоно.
export function money(value) {
  return new Intl.NumberFormat("mn-MN").format(Number(value || 0)) + "₮";
}

// Product-ийн үндсэн зургийг олно.
export function productImage(product, color = "") {
  const images = product?.images || [];
  // Өнгө дамжуулсан бол тухайн өнгийн үндсэн зураг эсвэл эхний зургийг сонгоно.
  const colorImages = color
    ? images.filter(image => image.color === color)
    : [];
  if (colorImages.length) {
    return colorImages.find(image => image.is_primary)?.image_url
      || colorImages[0]?.image_url
      || "";
  }
  return images.find(image => image.is_primary)?.image_url || images[0]?.image_url || "";
}

// Барааны бодит борлуулах үнийг сонгоно.
export function salePrice(product) {
  return Number(product?.discount_price || product?.price || 0);
}
