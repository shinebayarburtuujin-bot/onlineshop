import { supabase, isSupabaseConfigured } from "./supabase.js";

// false үед login, true үед sign-up форм харагдана.
let isSignUpMode = false;
const title = document.querySelector("#authTitle");
const submitButton = document.querySelector("#submitButton");
const toggleButton = document.querySelector("#toggleAuth");
const message = document.querySelector("#formMessage");

// Хуудас нээгдэхэд өмнө нь нэвтэрсэн session байгаа эсэхийг шалгана.
// Session байвал хэрэглэгч дахин нэвтрэх шаардлагагүй тул нүүр рүү шилжүүлнэ.
async function redirectIfAlreadySignedIn() {
  if (!isSupabaseConfigured) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.href = "index.html";
}

// "Харах" товчоор нууц үгийг түр харуулах/нуух боломжтой болгоно.
document.querySelector("#showPassword").onclick = (event) => {
  const passwordInput = document.querySelector("#password");
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  event.currentTarget.textContent = isHidden ? "Нуух" : "Харах";
};

// Нууц үг сэргээх холбоосыг хэрэглэгчийн и-мэйл рүү илгээнэ.
document.querySelector("#forgotPassword").onclick = async () => {
  const email = document.querySelector("#email").value.trim();
  if (!email) {
    message.textContent = "Нууц үг сэргээхийн өмнө и-мэйлээ оруулна уу.";
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/login.html`
  });
  message.textContent = error
    ? error.message
    : "Нууц үг сэргээх холбоос и-мэйл рүү илгээгдлээ.";
};

// Нэвтрэх болон бүртгүүлэх горимын хооронд шилжинэ.
toggleButton.onclick = () => {
  isSignUpMode = !isSignUpMode;
  title.textContent = isSignUpMode ? "Бүртгүүлэх" : "Нэвтрэх";
  submitButton.textContent = title.textContent;
  toggleButton.textContent = isSignUpMode
    ? "Бүртгэлтэй юу? Нэвтрэх"
    : "Шинэ хэрэглэгч үү? Бүртгүүлэх";
  document.querySelector(".signup-only").classList.toggle("hidden", !isSignUpMode);
  message.textContent = "";
};

// Форм илгээгдэхэд Supabase Auth-ийн signUp эсвэл signIn функцийг дуудна.
document.querySelector("#authForm").onsubmit = async (event) => {
  event.preventDefault();

  // URL/key тохируулаагүй үед ойлгомжтой сануулга үзүүлнэ.
  if (!isSupabaseConfigured) {
    message.textContent =
      "Эхлээд js/supabase.js файлд URL болон anon key оруулна уу.";
    return;
  }

  submitButton.disabled = true;
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;

  const result = isSignUpMode
    ? await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: document.querySelector("#fullName").value }
        }
      })
    : await supabase.auth.signInWithPassword({ email, password });

  submitButton.disabled = false;

  if (result.error) {
    message.textContent = result.error.message;
    return;
  }

  message.style.color = "var(--sage)";
  message.textContent = isSignUpMode
    ? "Бүртгэл амжилттай. И-мэйлээ шалгана уу."
    : "Амжилттай нэвтэрлээ.";

  // Нэвтэрсний дараа нүүр хуудас руу шилжинэ.
  if (!isSignUpMode) setTimeout(() => (location.href = "index.html"), 700);
};

redirectIfAlreadySignedIn();
