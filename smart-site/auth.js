(() => {
  const $ = (id) => document.getElementById(id);
  const status = (message, kind = "") => {
    $("status").textContent = message;
    $("status").className = "status " + kind;
  };
  const config = window.SMART_SITE_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey ||
      config.supabaseUrl.includes("YOUR_PROJECT_REF") ||
      config.supabaseAnonKey.includes("YOUR_SUPABASE")) {
    status("ابتدا supabase-config.example.js را به supabase-config.js کپی کنید و URL و کلید عمومی پروژه را وارد کنید.", "error");
    $("submitBtn").disabled = true;
    return;
  }
  if (!window.supabase?.createClient) {
    status("کتابخانه اتصال بارگذاری نشد. اتصال اینترنت و CDN را بررسی کنید.", "error");
    $("submitBtn").disabled = true;
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let mode = "login";

  function setMode(next) {
    mode = next;
    $("loginTab").classList.toggle("active", mode === "login");
    $("signupTab").classList.toggle("active", mode === "signup");
    $("submitBtn").textContent = mode === "login" ? "ورود امن" : "ساخت حساب";
    $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
    status("");
  }
  function showWorkspace(session) {
    $("authForm").classList.toggle("hidden", !!session);
    $("workspace").classList.toggle("hidden", !session);
    $("loginTab").classList.toggle("hidden", !!session);
    $("signupTab").classList.toggle("hidden", !!session);
    if (session) status("حساب وارد شده است: " + (session.user.email || ""), "ok");
  }

  $("loginTab").addEventListener("click", () => setMode("login"));
  $("signupTab").addEventListener("click", () => setMode("signup"));

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    $("submitBtn").disabled = true;
    status("در حال برقراری ارتباط...");
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) { showWorkspace(data.session); location.href = "./index.html"; }
        else status("حساب ایجاد شد. ایمیل خود را برای تأیید حساب بررسی کنید.", "ok");
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showWorkspace(data.session);
        location.href = "./index.html";
      }
    } catch (error) {
      status(error.message || "عملیات ناموفق بود.", "error");
    } finally {
      $("submitBtn").disabled = false;
    }
  });

  $("tenantForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("tenantName").value.trim();
    const slug = $("tenantSlug").value.trim().toLowerCase();
    const locale = $("locale").value;
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(slug)) {
      status("شناسه باید ۳ تا ۶۳ کاراکتر و فقط شامل حروف کوچک لاتین، عدد و خط تیره باشد.", "error");
      return;
    }
    status("در حال ایجاد سازمان...");
    try {
      const { data, error } = await client.rpc("create_tenant", {
        tenant_name: name, tenant_slug: slug, tenant_locale: locale
      });
      if (error) throw error;
      status("سازمان ایجاد شد. در حال ورود به فضای کاری...", "ok");
      location.href = "./index.html";
    } catch (error) {
      status(error.message || "ایجاد سازمان ناموفق بود.", "error");
    }
  });

  $("signOut").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) status(error.message, "error");
    else { showWorkspace(null); status("از حساب خارج شدید.", "ok"); }
  });

  client.auth.onAuthStateChange((_event, session) => showWorkspace(session));
  client.auth.getSession().then(({ data, error }) => {
    if (error) status(error.message, "error");
    showWorkspace(data.session);
  });
})();
