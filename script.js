"use strict";

const STORAGE_KEY = "pageturn-library-v1";

/**
 * Singleton: the private static instance is created once and returned for
 * every later getInstance() call. The constructor guard also prevents callers
 * from bypassing the shared instance with `new LibraryManager()`.
 */
class LibraryManager {
  static #instance;

  constructor() {
    if (LibraryManager.#instance) {
      return LibraryManager.#instance;
    }

    this.data = this.loadData();
    LibraryManager.#instance = this;
  }

  static getInstance() {
    if (!LibraryManager.#instance) {
      LibraryManager.#instance = new LibraryManager();
    }
    return LibraryManager.#instance;
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.books) && Array.isArray(parsed.members) && Array.isArray(parsed.loans)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Could not load saved library data.", error);
      showToast("Saved data could not be loaded. Sample data has been restored.", true);
    }
    return this.createSampleData();
  }

  createSampleData() {
    const now = new Date();
    const dateOffset = (days) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const members = [
      { id: "m-1", name: "Olivia Bennett", email: "olivia.bennett@college.edu", phone: "+1 (555) 014-0281", joined: dateOffset(-150) },
      { id: "m-2", name: "Ethan Parker", email: "ethan.parker@college.edu", phone: "+1 (555) 014-0392", joined: dateOffset(-118) },
      { id: "m-3", name: "Sophia Chen", email: "sophia.chen@college.edu", phone: "+1 (555) 014-0473", joined: dateOffset(-90) },
      { id: "m-4", name: "Liam Johnson", email: "liam.johnson@college.edu", phone: "+1 (555) 014-0584", joined: dateOffset(-62) },
      { id: "m-5", name: "Maya Patel", email: "maya.patel@college.edu", phone: "+1 (555) 014-0615", joined: dateOffset(-24) }
    ];
    const books = [
      { id: "b-1", title: "The Design of Everyday Things", author: "Don Norman", category: "Design", isbn: "978-0465050659" },
      { id: "b-2", title: "Atomic Habits", author: "James Clear", category: "Self Development", isbn: "978-0735211292" },
      { id: "b-3", title: "Clean Code", author: "Robert C. Martin", category: "Technology", isbn: "978-0132350884" },
      { id: "b-4", title: "Educated", author: "Tara Westover", category: "Biography", isbn: "978-0399590504" },
      { id: "b-5", title: "The Midnight Library", author: "Matt Haig", category: "Fiction", isbn: "978-0525559474" },
      { id: "b-6", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology", isbn: "978-0374533557" },
      { id: "b-7", title: "Sapiens", author: "Yuval Noah Harari", category: "History", isbn: "978-0062316097" },
      { id: "b-8", title: "The Pragmatic Programmer", author: "David Thomas", category: "Technology", isbn: "978-0135957059" }
    ];
    return {
      books,
      members,
      loans: [
        { id: "l-1", bookId: "b-3", memberId: "m-1", issueDate: dateOffset(-6), dueDate: dateOffset(8), returnDate: null },
        { id: "l-2", bookId: "b-5", memberId: "m-3", issueDate: dateOffset(-3), dueDate: dateOffset(11), returnDate: null },
        { id: "l-3", bookId: "b-7", memberId: "m-2", issueDate: dateOffset(-1), dueDate: dateOffset(13), returnDate: null },
        { id: "l-4", bookId: "b-2", memberId: "m-4", issueDate: dateOffset(-18), dueDate: dateOffset(-4), returnDate: dateOffset(-5) },
        { id: "l-5", bookId: "b-1", memberId: "m-5", issueDate: dateOffset(-25), dueDate: dateOffset(-11), returnDate: dateOffset(-12) }
      ]
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error("Could not save library data.", error);
      showToast("Your browser could not save the latest changes.", true);
    }
  }

  getActiveLoan(bookId) {
    return this.data.loans.find((loan) => loan.bookId === bookId && !loan.returnDate);
  }

  addBook(book) {
    if (this.data.books.some((item) => item.isbn.toLowerCase() === book.isbn.toLowerCase())) {
      throw new Error("A book with this ISBN already exists.");
    }
    this.data.books.unshift({ id: createId("b"), ...book });
    this.save();
  }

  deleteBook(bookId) {
    if (this.getActiveLoan(bookId)) {
      throw new Error("This book is currently issued. Return it before deleting it.");
    }
    this.data.books = this.data.books.filter((book) => book.id !== bookId);
    this.save();
  }

  addMember(member) {
    if (this.data.members.some((item) => item.email.toLowerCase() === member.email.toLowerCase())) {
      throw new Error("A member with this email address is already registered.");
    }
    this.data.members.unshift({ id: createId("m"), joined: todayISO(), ...member });
    this.save();
  }

  deleteMember(memberId) {
    const hasActiveLoan = this.data.loans.some((loan) => loan.memberId === memberId && !loan.returnDate);
    if (hasActiveLoan) {
      throw new Error("This member has an active loan. Record the return before deleting them.");
    }
    this.data.members = this.data.members.filter((member) => member.id !== memberId);
    this.save();
  }

  issueBook(bookId, memberId) {
    const book = this.data.books.find((item) => item.id === bookId);
    const member = this.data.members.find((item) => item.id === memberId);
    if (!book || !member) throw new Error("Choose a valid book and registered member.");
    if (this.getActiveLoan(bookId)) throw new Error("That book is not available right now.");
    const issueDate = todayISO();
    const due = new Date(`${issueDate}T12:00:00`);
    due.setDate(due.getDate() + 14);
    this.data.loans.unshift({
      id: createId("l"),
      bookId,
      memberId,
      issueDate,
      dueDate: due.toISOString().slice(0, 10),
      returnDate: null
    });
    this.save();
  }

  returnBook(loanId) {
    const loan = this.data.loans.find((item) => item.id === loanId && !item.returnDate);
    if (!loan) throw new Error("This loan is no longer active.");
    loan.returnDate = todayISO();
    this.save();
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function showToast(message, isError = false) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3500);
}

const library = LibraryManager.getInstance();
const modalBackdrop = document.getElementById("modal-backdrop");
const modalForm = document.getElementById("modal-form");
const modalFields = document.getElementById("modal-fields");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalSubmit = document.getElementById("modal-submit");
const formError = document.getElementById("form-error");
let currentModalType = "";

function render() {
  renderStats();
  renderBooks();
  renderMembers();
  renderTransactions();
  renderRecentTransactions();
}

function renderStats() {
  const activeLoans = library.data.loans.filter((loan) => !loan.returnDate);
  const totalBooks = library.data.books.length;
  document.getElementById("stat-books").textContent = totalBooks;
  document.getElementById("stat-members").textContent = library.data.members.length;
  document.getElementById("stat-issued").textContent = activeLoans.length;
  document.getElementById("stat-available").textContent = totalBooks - activeLoans.length;
  document.getElementById("book-nav-count").textContent = totalBooks;
  document.getElementById("collection-total").textContent = totalBooks;
  document.getElementById("available-legend-count").textContent = totalBooks - activeLoans.length;
  document.getElementById("issued-legend-count").textContent = activeLoans.length;
  const availablePercent = totalBooks ? ((totalBooks - activeLoans.length) / totalBooks) * 100 : 0;
  document.getElementById("available-bar").style.width = `${availablePercent}%`;
  document.getElementById("issued-bar").style.width = `${100 - availablePercent}%`;
}

function getBookStatus(bookId) {
  return library.getActiveLoan(bookId) ? "issued" : "available";
}

function bookCell(book) {
  const coverIndex = (Number(book.id.replace(/\D/g, "").slice(-1)) || 0) % 5 + 1;
  return `<div class="book-cell"><span class="book-cover cover-${coverIndex}" aria-hidden="true">PT</span><span class="book-info"><strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.isbn)}</small></span></div>`;
}

function memberCell(member) {
  const names = member.name.trim().split(/\s+/);
  const initials = names.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const avatarIndex = (member.name.length % 4) + 1;
  return `<div class="member-identity"><span class="mini-avatar avatar-${avatarIndex}">${escapeHTML(initials)}</span><span class="member-info"><strong>${escapeHTML(member.name)}</strong><small>${escapeHTML(member.id.toUpperCase())}</small></span></div>`;
}

function statusBadge(status) {
  const labels = { available: "Available", issued: "Issued", returned: "Returned", overdue: "Overdue" };
  return `<span class="status-badge status-${status}">${labels[status] || escapeHTML(status)}</span>`;
}

function renderBooks() {
  const query = document.getElementById("book-search").value.trim().toLowerCase();
  const filter = document.getElementById("book-filter").value;
  const books = library.data.books.filter((book) => {
    const matchesText = [book.title, book.author, book.category, book.isbn].some((value) => value.toLowerCase().includes(query));
    return matchesText && (filter === "all" || getBookStatus(book.id) === filter);
  });
  document.getElementById("books-count").textContent = library.data.books.length;
  document.getElementById("books-table").innerHTML = books.map((book) => {
    const status = getBookStatus(book.id);
    return `<tr><td>${bookCell(book)}</td><td>${escapeHTML(book.author)}</td><td><span class="category-tag">${escapeHTML(book.category)}</span></td><td>${escapeHTML(book.isbn)}</td><td>${statusBadge(status)}</td><td><div class="row-actions"><button class="action-button icon-action" type="button" data-delete-book="${escapeHTML(book.id)}" aria-label="Delete ${escapeHTML(book.title)}" title="Delete book"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></td></tr>`;
  }).join("");
  toggleEmptyState("books-empty", books.length === 0);
}

function renderMembers() {
  const query = document.getElementById("member-search").value.trim().toLowerCase();
  const members = library.data.members.filter((member) => [member.name, member.email, member.phone].some((value) => value.toLowerCase().includes(query)));
  document.getElementById("members-count").textContent = library.data.members.length;
  document.getElementById("members-table").innerHTML = members.map((member) => {
    const activeLoans = library.data.loans.filter((loan) => loan.memberId === member.id && !loan.returnDate).length;
    return `<tr><td>${memberCell(member)}</td><td>${escapeHTML(member.email)}</td><td>${escapeHTML(member.phone || "—")}</td><td>${formatDate(member.joined)}</td><td>${activeLoans ? `<span class="count-pill">${activeLoans} active</span>` : '<span class="category-tag">None</span>'}</td><td><div class="row-actions"><button class="action-button icon-action" type="button" data-delete-member="${escapeHTML(member.id)}" aria-label="Delete ${escapeHTML(member.name)}" title="Delete member"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></td></tr>`;
  }).join("");
  toggleEmptyState("members-empty", members.length === 0);
}

function loanStatus(loan) {
  if (loan.returnDate) return "returned";
  return loan.dueDate < todayISO() ? "overdue" : "issued";
}

function renderTransactions() {
  const filter = document.getElementById("transaction-filter").value;
  const loans = library.data.loans.filter((loan) => {
    if (filter === "active") return !loan.returnDate;
    if (filter === "returned") return Boolean(loan.returnDate);
    return true;
  });
  document.getElementById("transactions-count").textContent = library.data.loans.length;
  document.getElementById("transactions-table").innerHTML = loans.map((loan) => {
    const book = library.data.books.find((item) => item.id === loan.bookId);
    const member = library.data.members.find((item) => item.id === loan.memberId);
    if (!book || !member) return "";
    const status = loanStatus(loan);
    const action = loan.returnDate ? '<span class="category-tag">Completed</span>' : `<button class="action-button return-action" type="button" data-return-loan="${escapeHTML(loan.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg> Return</button>`;
    return `<tr><td>${bookCell(book)}</td><td>${memberCell(member)}</td><td>${formatDate(loan.issueDate)}</td><td>${formatDate(loan.dueDate)}</td><td>${statusBadge(status)}</td><td><div class="row-actions">${action}</div></td></tr>`;
  }).join("");
  toggleEmptyState("transactions-empty", loans.length === 0);
}

function renderRecentTransactions() {
  const rows = library.data.loans.slice(0, 4);
  document.getElementById("recent-transactions").innerHTML = rows.map((loan) => {
    const book = library.data.books.find((item) => item.id === loan.bookId);
    const member = library.data.members.find((item) => item.id === loan.memberId);
    if (!book || !member) return "";
    return `<tr><td><div class="book-info"><strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.author)}</small></div></td><td><div class="member-info"><strong>${escapeHTML(member.name)}</strong></div></td><td>${formatDate(loan.issueDate)}</td><td>${statusBadge(loanStatus(loan))}</td></tr>`;
  }).join("");
  if (rows.length === 0) {
    document.getElementById("recent-transactions").innerHTML = '<tr><td colspan="4" class="category-tag">No activity yet. Issue a book to see it here.</td></tr>';
  }
}

function toggleEmptyState(id, isEmpty) {
  document.getElementById(id).classList.toggle("hidden", !isEmpty);
}

const field = (name, label, options = {}) => {
  const required = options.required === false ? "" : " required";
  const full = options.full ? " full-width" : "";
  const placeholder = options.placeholder ? ` placeholder="${escapeHTML(options.placeholder)}"` : "";
  if (options.select) {
    const choices = options.select.map((choice) => `<option value="${escapeHTML(choice.value)}">${escapeHTML(choice.label)}</option>`).join("");
    return `<div class="form-field${full}"><label for="field-${name}">${label}</label><select id="field-${name}" name="${name}"${required}><option value="">Select ${label.toLowerCase()}</option>${choices}</select></div>`;
  }
  return `<div class="form-field${full}"><label for="field-${name}">${label}</label><input id="field-${name}" name="${name}" type="${options.type || "text"}"${placeholder}${required}${options.maxLength ? ` maxlength="${options.maxLength}"` : ""}${options.pattern ? ` pattern="${options.pattern}"` : ""}></div>`;
};

function openModal(type) {
  currentModalType = type;
  formError.classList.add("hidden");
  formError.textContent = "";
  modalForm.reset();
  const configs = {
    book: {
      title: "Add a book",
      description: "Add a new title to your library collection.",
      submit: "Add book",
      fields: field("title", "Book title", { full: true, placeholder: "e.g. The Great Gatsby", maxLength: 100 }) +
        field("author", "Author", { placeholder: "e.g. F. Scott Fitzgerald", maxLength: 80 }) +
        field("category", "Category", { placeholder: "e.g. Fiction", maxLength: 40 }) +
        field("isbn", "ISBN", { full: true, placeholder: "e.g. 978-0743273565", maxLength: 20 })
    },
    member: {
      title: "Register a member",
      description: "Create a member profile to enable book borrowing.",
      submit: "Register member",
      fields: field("name", "Full name", { full: true, placeholder: "e.g. Jordan Lee", maxLength: 80 }) +
        field("email", "Email address", { type: "email", placeholder: "name@college.edu", maxLength: 120 }) +
        field("phone", "Phone number", { type: "tel", placeholder: "+1 (555) 123-4567", maxLength: 25 })
    },
    issue: {
      title: "Issue a book",
      description: "Choose an available book and a registered member.",
      submit: "Confirm issue",
      fields: field("bookId", "Available book", { full: true, select: library.data.books.filter((book) => getBookStatus(book.id) === "available").map((book) => ({ value: book.id, label: `${book.title} — ${book.author}` })) }) +
        field("memberId", "Member", { full: true, select: library.data.members.map((member) => ({ value: member.id, label: `${member.name} (${member.email})` })) })
    }
  };
  const config = configs[type];
  if (!config) return;
  modalTitle.textContent = config.title;
  modalDescription.textContent = config.description;
  modalSubmit.textContent = config.submit;
  modalFields.innerHTML = config.fields;
  modalBackdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const firstInput = modalFields.querySelector("input, select");
  if (firstInput) firstInput.focus();
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  document.body.style.overflow = "";
  currentModalType = "";
}

function handleFormSubmit(event) {
  event.preventDefault();
  formError.classList.add("hidden");
  if (!modalForm.reportValidity()) return;
  const values = Object.fromEntries(new FormData(modalForm).entries());
  try {
    if (currentModalType === "book") {
      const book = {
        title: values.title.trim(),
        author: values.author.trim(),
        category: values.category.trim(),
        isbn: values.isbn.trim()
      };
      if (Object.values(book).some((value) => !value)) throw new Error("Please complete every book detail.");
      library.addBook(book);
      showToast("Book added to your collection.");
    } else if (currentModalType === "member") {
      const member = { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() };
      if (!member.name || !member.email) throw new Error("Please enter a name and a valid email address.");
      library.addMember(member);
      showToast("Member registered successfully.");
    } else if (currentModalType === "issue") {
      library.issueBook(values.bookId, values.memberId);
      showToast("Book issued. It is due in 14 days.");
    }
    closeModal();
    render();
  } catch (error) {
    formError.textContent = error.message || "The change could not be saved.";
    formError.classList.remove("hidden");
  }
}

function navigateTo(view) {
  if (!document.getElementById(`view-${view}`)) return;
  document.querySelectorAll(".view-section").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
  document.getElementById("breadcrumb-current").textContent = activeLink ? activeLink.querySelector("span").textContent : "Dashboard";
  document.title = `${activeLink ? activeLink.querySelector("span").textContent : "Dashboard"} | PageTurn Library`;
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebar-backdrop").classList.remove("is-visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const viewLink = event.target.closest("[data-view]");
  if (viewLink) {
    event.preventDefault();
    navigateTo(viewLink.dataset.view);
    if (viewLink.matches(".nav-link")) window.history.replaceState(null, "", `#${viewLink.dataset.view}`);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (action) {
    const types = { "add-book": "book", "add-member": "member", "issue-book": "issue" };
    openModal(types[action.dataset.action]);
    return;
  }
  const deleteBookButton = event.target.closest("[data-delete-book]");
  if (deleteBookButton) {
    const book = library.data.books.find((item) => item.id === deleteBookButton.dataset.deleteBook);
    if (!book) return;
    try {
      library.deleteBook(book.id);
      showToast("Book deleted from the collection.");
      render();
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const deleteMemberButton = event.target.closest("[data-delete-member]");
  if (deleteMemberButton) {
    const member = library.data.members.find((item) => item.id === deleteMemberButton.dataset.deleteMember);
    if (!member) return;
    try {
      library.deleteMember(member.id);
      showToast("Member deleted.");
      render();
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const returnButton = event.target.closest("[data-return-loan]");
  if (returnButton) {
    try {
      library.returnBook(returnButton.dataset.returnLoan);
      showToast("Book return recorded.");
      render();
    } catch (error) {
      showToast(error.message, true);
    }
  }
});

modalForm.addEventListener("submit", handleFormSubmit);
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal();
});
document.getElementById("book-search").addEventListener("input", renderBooks);
document.getElementById("book-filter").addEventListener("change", renderBooks);
document.getElementById("member-search").addEventListener("input", renderMembers);
document.getElementById("transaction-filter").addEventListener("change", renderTransactions);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("is-open");
  document.getElementById("sidebar-backdrop").classList.toggle("is-visible");
});
document.getElementById("sidebar-backdrop").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebar-backdrop").classList.remove("is-visible");
});
document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
document.getElementById("footer-year").textContent = new Date().getFullYear();

if (window.location.hash && document.getElementById(`view-${window.location.hash.slice(1)}`)) {
  navigateTo(window.location.hash.slice(1));
}
render();
