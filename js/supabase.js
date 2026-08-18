// Supabase JavaScript SDK-ийн ES module хувилбараас клиент үүсгэх
// createClient функцийг CDN хаягаар шууд импортлоно.
// Энэ нь лавлах dadlaga_finance_project төслийн ашигласан аргатай ижил.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase Dashboard → Project Settings → API хэсгээс төслийн URL-г авна.
// Project URL нь тухайн Supabase төслийг заах нийтийн хаяг юм.
export const SUPABASE_URL = "https://kacyawyefttxnfyvnqsz.supabase.co";

// Supabase Dashboard → Project Settings → API Keys хэсгийн
// Publishable key (эсвэл хуучин нэрээр anon public key)-г энд оруулна.
// Энэ нь browser-д ашиглах зориулалттай public key; service_role key бүү ашиглаарай.
export const SUPABASE_ANON_KEY = "sb_publishable_ytRaBZriI7ltSq-PpdeG5g_TajcJmg5";

// Тохиргооны утгууд орсон эсэхийг шалгах хувьсагч.
// Auth хуудсууд тохиргоо дутуу үед ойлгомжтой анхааруулга үзүүлэхэд ашиглана.
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_ANON_KEY.startsWith("YOUR_");

// Бүх JavaScript файл нэг ижил Supabase холболтыг импортлон ашиглана.
// createClient-ийн эхний утга нь Project URL, хоёр дахь нь public key байна.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Browser-ийн Console хэсгээс модуль амжилттай ачаалсныг шалгах мэдээлэл.
console.log("Supabase амжилттай холбогдлоо");
