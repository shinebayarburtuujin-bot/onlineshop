// Профайлын мэдээллийг Supabase profiles хүснэгттэй бодитоор холбоно.
import { supabase } from "./supabase.js";
import { requireUser } from "./store.js";

const profileForm = document.querySelector("#profileForm");
const profileMessage = document.querySelector("#profileMessage");
const addressForm = document.querySelector("#addressForm");
const addressCard = document.querySelector("#addressCard");
let user = null;
let profile = null;

// Нэвтэрсэн хэрэглэгчийн profile мөрийг уншиж формд байрлуулна.
async function loadProfile() {
  user = await requireUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, address, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    showMessage(`Профайл уншихад алдаа гарлаа: ${error.message}`);
    return;
  }

  profile = data || {};
  const nameParts = (profile.full_name || user.user_metadata?.full_name || "").trim().split(/\s+/);
  document.querySelector("#profileLastName").value = nameParts.length > 1 ? nameParts[0] : "";
  document.querySelector("#profileFirstName").value = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "";
  document.querySelector("#profilePhone").value = profile.phone || "";
  document.querySelector("#profileEmail").value = user.email || "";
  renderAddress(profile.address);
}

document.querySelector("#editProfile").onclick = () => {
  document.querySelector("#profileLastName").focus();
};

// Нэр болон утсыг profiles хүснэгтэд upsert хийнэ.
profileForm.addEventListener("submit", async event => {
  event.preventDefault();
  const fullName = [
    document.querySelector("#profileLastName").value.trim(),
    document.querySelector("#profileFirstName").value.trim()
  ].filter(Boolean).join(" ");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    phone: document.querySelector("#profilePhone").value.trim(),
    address: profile?.address || null
  });

  if (error) showMessage(`Хадгалахад алдаа гарлаа: ${error.message}`);
  else {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    showMessage("Мэдээлэл амжилттай хадгалагдлаа.", true);
  }
});

document.querySelector("#newAddressButton").onclick = () => addressForm.classList.remove("hidden");
document.querySelector("#editAddress").onclick = () => addressForm.classList.remove("hidden");
document.querySelector("#cancelAddress").onclick = () => addressForm.classList.add("hidden");

// Хүргэлтийн хаягийг profiles.address талбарт хадгална.
addressForm.addEventListener("submit", async event => {
  event.preventDefault();
  const address = document.querySelector("#addressValue").value.trim();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: profile?.full_name || user.user_metadata?.full_name || "",
    phone: document.querySelector("#profilePhone").value.trim(),
    address
  });
  if (error) {
    alert(`Хаяг хадгалахад алдаа гарлаа: ${error.message}`);
    return;
  }
  profile = { ...profile, address };
  renderAddress(address);
  addressForm.classList.add("hidden");
});

// Хаяг устгахад profiles.address талбарыг NULL болгоно.
document.querySelector("#deleteAddress").onclick = async () => {
  if (!confirm("Энэ хаягийг устгах уу?")) return;
  const { error } = await supabase
    .from("profiles")
    .update({ address: null })
    .eq("id", user.id);
  if (error) alert(`Хаяг устгахад алдаа гарлаа: ${error.message}`);
  else {
    profile.address = null;
    renderAddress(null);
  }
};

// Шинэ нууц үгийг хэрэглэгчээс авч Supabase Auth-д шинэчилнэ.
document.querySelector("#changePassword").onclick = async () => {
  const password = prompt("Шинэ нууц үгээ оруулна уу (хамгийн багадаа 6 тэмдэгт):");
  if (!password) return;
  const { error } = await supabase.auth.updateUser({ password });
  alert(error ? `Нууц үг солиход алдаа гарлаа: ${error.message}` : "Нууц үг амжилттай солигдлоо.");
};

function renderAddress(address) {
  addressCard.classList.toggle("hidden", !address);
  if (!address) return;
  document.querySelector("#addressValue").value = address;
  addressCard.querySelector("p").innerHTML = `${address}<br>Утас: ${profile?.phone || "-"}`;
}

function showMessage(text, success = false) {
  profileMessage.textContent = text;
  profileMessage.style.color = success ? "var(--sage)" : "var(--sale)";
}

loadProfile();
