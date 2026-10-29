/* 호스트 페이지 연동
 * CareerPromo.setMember({ name, phone, email })
 * CareerPromo.setEndpoints({ reservation, consent })
 * CareerPromo.setLinks({ loginUrl, privacyPolicyUrl })
 *
 * 예약 본문
 * field: humanities_social | business_economics | arts_sports | natural_science | engineering_it | other_convergence
 * audience: member | guest
 * channels: email, sms
 * privacyConsent, privacyConsentAt
 * marketingConsent, marketingConsentAt
 * contact: { name, phone, email }
 *
 * 응답 status: reserved | already_reserved | cancelled
 * 주소가 비어 있으면 서버로 보내지 않고 완료 화면만 엽니다.
 */
(() => {
  const root = document.querySelector(".career-promo");
  if (!root) return;

  const STORAGE_KEY = "career-promo-reservations";
  const PHONE = /^01[016789]-?\d{3,4}-?\d{4}$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const COPY = {
    field: "계열을 하나 골라 주시면 예약할 수 있어요.",
    fieldDone: (label) => `${label} 계열로 선택했어요. 3월에 이 계열의 직무 탐색 자료를 보내드릴게요.`,
    phone: "전화번호를 확인해 주세요.",
    phoneAgain: "전화번호를 다시 확인해 주세요.",
    name: "이름을 입력해 주세요.",
    email: "이메일 형식을 다시 확인해 주세요.",
    privacy: "개인정보 수집·이용에 동의해 주셔야 예약할 수 있어요.",
    channel: "자료를 받을 방법(이메일 또는 문자)을 하나 이상 골라 주세요.",
    failed: "예약 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    unavailable: "지금은 예약할 수 없어요. 잠시 후 다시 시도해 주세요.",
    pending: "예약하는 중이에요",
    submit: "취업 자료 예약하기",
    done: "예약이 완료됐어요",
    already: "이미 예약되어 있어요",
  };

  const config = {
    endpoints: { reservation: "", consent: "" },
    loginUrl: "",
    privacyPolicyUrl: "",
    member: null,
  };

  const qs = (selector) => root.querySelector(selector);
  const qsa = (selector) => [...root.querySelectorAll(selector)];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior = () => (motion.matches ? "auto" : "smooth");

  const track = qs(".material-track");
  const cardPrev = qs(".card-prev");
  const cardNext = qs(".card-next");
  const fieldInputs = qsa('input[name="field"]');
  const fieldFeedback = qs(".field-feedback");
  const fieldTitle = qs("#fieldCardTitle");
  const fieldSet = qs(".field-options");
  const selectedLabels = qsa(".selected-field");
  const stateButtons = qsa(".state-btn");
  const forms = qsa(".reserve-form");
  const guestForm = qs(".guest-form");
  const completion = qs("#completion");
  const alreadyBtn = qs(".already-btn");
  const alreadyCopy = qs(".already-copy");
  const sticky = qs(".sticky-cta");
  const modals = {
    privacy: qs("#privacyModal"),
    marketing: qs("#marketingModal"),
  };

  function fieldInput() {
    return fieldInputs.find((input) => input.checked) || null;
  }

  function fieldValue() {
    return fieldInput()?.value || "";
  }

  function fieldLabel(input = fieldInput()) {
    return input?.closest("label")?.querySelector("b")?.textContent.trim() || "";
  }

  function setCardTitle(label) {
    fieldTitle.replaceChildren(
      document.createTextNode(label ? `${label} 직무 탐색` : "내 계열 직무 탐색"),
      document.createElement("br"),
      document.createTextNode("자료"),
    );
  }

  function syncField() {
    const label = fieldLabel();
    fieldFeedback.textContent = label ? COPY.fieldDone(label) : COPY.field;
    setCardTitle(label);
    selectedLabels.forEach((item) => {
      item.textContent = label || "미선택";
    });
    if (label) fieldSet.removeAttribute("aria-invalid");
  }

  function scrollCards(direction) {
    const card = track.querySelector(".material-card");
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const amount = (card?.getBoundingClientRect().width || 370) + gap;
    track.scrollBy({ left: direction * amount, behavior: scrollBehavior() });
  }

  function updateCardControls() {
    const max = track.scrollWidth - track.clientWidth;
    cardPrev.disabled = track.scrollLeft <= 1;
    cardNext.disabled = track.scrollLeft >= max - 1;
  }

  function showAudience(state) {
    stateButtons.forEach((button) => {
      const active = button.dataset.state === state;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    forms.forEach((form) => {
      form.hidden = form.dataset.form !== state;
    });
  }

  function channels(form, name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  }

  function clearErrors(form) {
    form.querySelector(".form-error").textContent = "";
    form.querySelectorAll(".input-error").forEach((item) => {
      item.textContent = "";
    });
    form.querySelectorAll("input").forEach((input) => {
      input.classList.remove("invalid");
      if (input.type !== "checkbox" && input.type !== "radio") input.setAttribute("aria-invalid", "false");
    });
  }

  function setInputError(input, message) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    const error = input.nextElementSibling;
    if (error?.classList.contains("input-error")) error.textContent = message;
    input.focus();
  }

  function setFormError(form, message, focusTarget) {
    form.querySelector(".form-error").textContent = message;
    focusTarget?.focus();
  }

  function requireField(form) {
    if (fieldValue()) return true;
    setFormError(form, COPY.field);
    fieldSet.setAttribute("aria-invalid", "true");
    fieldInputs[0]?.focus();
    qs("#fieldSelect").scrollIntoView({ behavior: scrollBehavior() });
    return false;
  }

  function checked(form, name) {
    return Boolean(form.elements[name]?.checked);
  }

  function validateMember(form) {
    clearErrors(form);
    if (!requireField(form)) return null;
    const phone = form.elements.memberPhone;
    if (!PHONE.test(phone.value.trim())) {
      setInputError(phone, COPY.phone);
      return null;
    }
    if (!checked(form, "memberPrivacy")) {
      setFormError(form, COPY.privacy, form.elements.memberPrivacy);
      return null;
    }
    const selected = channels(form, "memberChannel");
    if (!selected.length) {
      setFormError(form, COPY.channel, form.querySelector('input[name="memberChannel"]'));
      return null;
    }
    return payload("member", form, selected);
  }

  function validateGuest(form) {
    clearErrors(form);
    if (!requireField(form)) return null;
    const name = form.elements.guestName;
    const phone = form.elements.guestPhone;
    const email = form.elements.guestEmail;
    if (!name.value.trim()) {
      setInputError(name, COPY.name);
      return null;
    }
    if (!PHONE.test(phone.value.trim())) {
      setInputError(phone, COPY.phoneAgain);
      return null;
    }
    if (!EMAIL.test(email.value.trim())) {
      setInputError(email, COPY.email);
      return null;
    }
    if (!checked(form, "privacy")) {
      setFormError(form, COPY.privacy, form.elements.privacy);
      return null;
    }
    const selected = channels(form, "guestChannel");
    if (!selected.length) {
      setFormError(form, COPY.channel, form.querySelector('input[name="guestChannel"]'));
      return null;
    }
    return payload("guest", form, selected);
  }

  function payload(audience, form, selectedChannels) {
    const now = new Date().toISOString();
    const marketing = checked(form, audience === "member" ? "memberMarketing" : "marketing");
    const member = config.member;
    return {
      field: fieldValue(),
      audience,
      channels: selectedChannels,
      privacyConsent: true,
      privacyConsentAt: now,
      marketingConsent: marketing,
      marketingConsentAt: marketing ? now : null,
      contact: audience === "member"
        ? {
          name: member?.name?.trim() || "",
          phone: form.elements.memberPhone.value.trim(),
          email: member?.email?.trim() || "",
        }
        : {
          name: form.elements.guestName.value.trim(),
          phone: form.elements.guestPhone.value.trim(),
          email: form.elements.guestEmail.value.trim(),
        },
    };
  }

  function consentRecord(body) {
    return {
      audience: body.audience,
      channels: body.channels,
      privacyConsent: body.privacyConsent,
      privacyConsentAt: body.privacyConsentAt,
      marketingConsent: body.marketingConsent,
      marketingConsentAt: body.marketingConsentAt,
    };
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("failed");
      error.code = "failed";
      error.payload = data;
      throw error;
    }
    return data;
  }

  function phoneKey(phone) {
    return String(phone || "").replace(/\D/g, "");
  }

  function readReservations() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  }

  function hasReservation(phone) {
    const key = phoneKey(phone);
    return Boolean(key && readReservations()[key]);
  }

  function rememberReservation(body) {
    const key = phoneKey(body.contact?.phone);
    if (!key) return;
    try {
      const saved = readReservations();
      if (saved[key]) return;
      saved[key] = { phone: key, at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* 저장을 못 해도 이번 화면의 신청은 막지 않습니다. */
    }
  }

  async function submitReservation(body) {
    if (hasReservation(body.contact.phone)) return { status: "already_reserved" };
    let result = { status: "reserved" };
    if (config.endpoints.reservation) result = await postJson(config.endpoints.reservation, body);
    const status = result.status || "reserved";
    if (status === "cancelled") {
      const error = new Error("unavailable");
      error.code = "unavailable";
      throw error;
    }
    if (status !== "reserved" && status !== "already_reserved") {
      const error = new Error("failed");
      error.code = "failed";
      throw error;
    }
    rememberReservation(body);
    if (status === "reserved" && config.endpoints.consent) await postJson(config.endpoints.consent, consentRecord(body));
    return { ...result, status };
  }

  function showCompletion(status) {
    const already = status === "already_reserved";
    completion.hidden = false;
    qs("#completionTitle").textContent = already ? COPY.already : COPY.done;
    alreadyCopy.hidden = !already;
    alreadyBtn.hidden = already;
    alreadyBtn.setAttribute("aria-expanded", "false");
    completion.focus();
    completion.scrollIntoView({ behavior: scrollBehavior() });
  }

  async function handleSubmit(form, validate) {
    if (form.dataset.submitting === "true" || form.dataset.submitting === "done") return;
    const body = validate(form);
    if (!body) return;
    const button = form.querySelector(".submit-reservation");
    const label = button.querySelector(".submit-label");
    form.dataset.submitting = "true";
    button.disabled = true;
    label.textContent = COPY.pending;
    try {
      const result = await submitReservation(body);
      if (result.status === "already_reserved") {
        form.dataset.submitting = "";
        button.disabled = false;
        label.textContent = COPY.submit;
        showCompletion(result.status);
        return;
      }
      form.dataset.submitting = "done";
      label.textContent = COPY.done;
      showCompletion(result.status);
    } catch (error) {
      form.dataset.submitting = "";
      button.disabled = false;
      label.textContent = COPY.submit;
      setFormError(form, error.code === "unavailable" ? COPY.unavailable : COPY.failed);
    }
  }

  function syncAllConsent() {
    const items = [guestForm.elements.privacy, guestForm.elements.marketing, ...guestForm.querySelectorAll('input[name="guestChannel"]')];
    guestForm.elements.allConsent.checked = items.every((item) => item.checked);
  }

  function applyMember(member) {
    config.member = member && typeof member === "object" ? member : null;
    const name = config.member?.name?.trim() || "{이름}";
    qsa(".member-name").forEach((node) => {
      node.textContent = name;
    });
    const nameSlot = qs("[data-member-name]");
    const emailSlot = qs("[data-member-email]");
    if (nameSlot) nameSlot.textContent = config.member?.name?.trim() || "회원 정보에서 자동 표시";
    if (emailSlot) emailSlot.textContent = config.member?.email?.trim() || "회원 정보에서 자동 표시";
    const phone = qs("#memberPhone");
    if (phone && config.member?.phone && !phone.value) phone.value = config.member.phone;
  }

  function applyLink(selector, url) {
    const anchor = qs(selector);
    if (anchor && url) anchor.href = url;
  }

  cardNext.addEventListener("click", () => scrollCards(1));
  cardPrev.addEventListener("click", () => scrollCards(-1));
  track.addEventListener("scroll", updateCardControls, { passive: true });
  window.addEventListener("resize", updateCardControls);
  updateCardControls();

  fieldInputs.forEach((input) => input.addEventListener("change", syncField));

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => showAudience(button.dataset.state));
  });

  guestForm.elements.allConsent.addEventListener("change", () => {
    const on = guestForm.elements.allConsent.checked;
    guestForm.elements.privacy.checked = on;
    guestForm.elements.marketing.checked = on;
    guestForm.querySelectorAll('input[name="guestChannel"]').forEach((item) => {
      item.checked = on;
    });
  });
  [guestForm.elements.privacy, guestForm.elements.marketing, ...guestForm.querySelectorAll('input[name="guestChannel"]')].forEach((item) => {
    item.addEventListener("change", syncAllConsent);
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest(".reserve-form");
    if (!form) return;
    event.preventDefault();
    handleSubmit(form, form.dataset.form === "member" ? validateMember : validateGuest);
  });

  alreadyBtn.addEventListener("click", () => {
    alreadyCopy.hidden = !alreadyCopy.hidden;
    const open = !alreadyCopy.hidden;
    alreadyBtn.textContent = open ? "안내 닫기" : "이미 예약한 경우 보기";
    alreadyBtn.setAttribute("aria-expanded", String(open));
  });

  const covered = new Set();
  const stickyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) covered.add(entry.target);
      else covered.delete(entry.target);
    });
    sticky.classList.toggle("hidden", covered.size > 0);
  }, { threshold: 0.08 });
  stickyObserver.observe(qs("#reservationForm"));
  stickyObserver.observe(completion);

  root.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-modal]");
    if (!opener) return;
    const modal = modals[opener.dataset.modal];
    if (modal && !modal.open) modal.showModal();
  });
  qsa(".detail-modal").forEach((modal) => {
    modal.querySelectorAll(".modal-close, .modal-confirm").forEach((button) => {
      button.addEventListener("click", () => modal.close());
    });
    modal.addEventListener("click", (event) => {
      const rect = modal.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) modal.close();
    });
  });

  qs("[data-login-link]")?.addEventListener("click", (event) => {
    if (!config.loginUrl) event.preventDefault();
  });

  window.CareerPromo = {
    config,
    setMember: applyMember,
    setEndpoints(endpoints = {}) {
      if ("reservation" in endpoints) config.endpoints.reservation = endpoints.reservation || "";
      if ("consent" in endpoints) config.endpoints.consent = endpoints.consent || "";
    },
    setLinks(links = {}) {
      if ("loginUrl" in links) {
        config.loginUrl = links.loginUrl || "";
        applyLink("[data-login-link]", config.loginUrl);
      }
      if ("privacyPolicyUrl" in links) {
        config.privacyPolicyUrl = links.privacyPolicyUrl || "";
        applyLink("[data-privacy-policy]", config.privacyPolicyUrl);
      }
    },
  };
})();
