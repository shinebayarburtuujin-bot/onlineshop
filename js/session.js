// Нэвтэрсэн хэрэглэгчийн гарах үйлдлийг бүх account хуудсанд удирдана.
import { supabase, isSupabaseConfigured } from "./supabase.js";

// Нэвтэрсэн хэрэглэгчийн нэр, и-мэйлийг account хуудсанд автоматаар харуулна.
async function showCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Session байхгүй үед хамгаалагдсан account хуудсыг login руу шилжүүлнэ.
    location.replace("login.html");
    return;
  }

  const email = user.email || "И-мэйлгүй хэрэглэгч";
  const fullName = user.user_metadata?.full_name || email.split("@")[0];
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join("");

  document.querySelectorAll("[data-user-email]").forEach(element => {
    element.textContent = email;
  });
  document.querySelectorAll("[data-user-name]").forEach(element => {
    element.textContent = fullName;
  });
  document.querySelectorAll("[data-user-initials]").forEach(element => {
    element.textContent = initials;
  });

  const profileEmail = document.querySelector("#profileEmail");
  if (profileEmail) profileEmail.value = email;

  // Нэвтэрсэн хэрэглэгчийн profiles мөрөөс эрхийг уншина.
  // role нь "admin" үед л профайл дээрх админ удирдлагын холбоосыг харуулна.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Хэрэглэгчийн эрхийг уншихад алдаа гарлаа:", profileError.message);
    return;
  }

  document.querySelectorAll("[data-admin-link]").forEach(adminLink => {
    adminLink.hidden = profile?.role !== "admin";
  });
}

document.querySelectorAll("[data-logout]").forEach((logoutButton) => {
  logoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    logoutButton.style.pointerEvents = "none";
    logoutButton.textContent = "Гарч байна...";

    // Supabase тохиргоотой бол хадгалагдсан auth session-ийг устгана.
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(`Гарахад алдаа гарлаа: ${error.message}`);
        logoutButton.style.pointerEvents = "";
        logoutButton.innerHTML = "<span>↪</span> Гарах";
        return;
      }
    }

    // Гарах үед зөвхөн хэрэглэгчийн session хаагдана.
    // Supabase-ийн сагсны өгөгдөл хэрэглэгчийн бүртгэлтэй холбоотой хэвээр үлдэнэ.
    location.replace("login.html");
  });
});

showCurrentUser();
