import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../api";
import { createMockClient } from "../../api/mockClient";
import { AppRoutes } from "../../routes/AppRoutes";
import { AuthProvider } from "../auth/AuthContext";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

async function setup(path: string, email = "admin@contoh.test") {
  const client = createMockClient({ storage: memoryStorage() });
  await client.login({ email, password: "demo1234" });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider client={client}>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe("akses rute /admin", () => {
  const paths = ["/admin/ro", "/admin/checklist", "/admin/kategori", "/admin/pengguna"];
  const cases = paths.flatMap((path) => ["rocan@contoh.test", "satker@contoh.test"].map((email) => [path, email]));
  it.each(cases)("%s ditolak untuk %s", async (path, email) => {
    await setup(path, email);
    expect(await screen.findByRole("heading", { name: /403/ })).toBeInTheDocument();
  });

  it("klien menolak non-admin", async () => {
    const client = createMockClient({ storage: memoryStorage() });
    await client.login({ email: "rocan@contoh.test", password: "demo1234" });
    await expect(client.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(client.createRo({ code: "9", description: "x" })).rejects.toBeInstanceOf(ApiError);
    await expect(client.getChecklist()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Master RO", () => {
  it("menambah, mengubah, menonaktifkan, dan menghapus RO", async () => {
    await setup("/admin/ro");
    const table = await screen.findByRole("table", { name: "Daftar RO" });
    expect(within(table).getByText("002")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Kode RO"), "010");
    await userEvent.type(screen.getByLabelText("Deskripsi RO"), "RO Baru");
    await userEvent.click(screen.getByRole("button", { name: "Tambah RO" }));
    expect(await screen.findByText("RO Baru")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ubah RO 010" }));
    const input = screen.getByLabelText("Deskripsi baru");
    await userEvent.clear(input);
    await userEvent.type(input, "RO Diubah");
    await userEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(await screen.findByText("RO Diubah")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan RO 010" }));
    expect(await screen.findByRole("button", { name: "Aktifkan RO 010" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hapus RO 010" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("RO 010 sudah dihapus.")).toBeInTheDocument();
    expect(screen.queryByText("RO Diubah")).not.toBeInTheDocument();
  });

  it("RO yang dipakai pengajuan tidak bisa dihapus", async () => {
    const client = await setup("/admin/ro");
    await screen.findByRole("table", { name: "Daftar RO" });
    await expect(client.deleteRo("001")).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Checklist", () => {
  it("memuat pemetaan 5W+1H sebagai data yang bisa diubah", async () => {
    const client = await setup("/admin/checklist");
    await screen.findByRole("table", { name: "Butir checklist" });
    expect(screen.getByText("Penerima manfaat")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ubah butir II.C.1.3" }));
    const source = screen.getByLabelText(/Dicari di bagian TOR \(pemetaan/);
    await userEvent.clear(source);
    await userEvent.type(source, "Sasaran kegiatan");
    await userEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(await screen.findByText("Sasaran kegiatan")).toBeInTheDocument();
    const saved = await client.getChecklist();
    expect(saved.items.find((i) => i.code === "II.C.1.3")?.source).toBe("Sasaran kegiatan");
  });

  it("menambah, memecah, menonaktifkan, dan menghapus butir", async () => {
    await setup("/admin/checklist");
    await screen.findByRole("table", { name: "Butir checklist" });

    await userEvent.type(screen.getByLabelText("Kode butir"), "V.A.1");
    await userEvent.type(screen.getByLabelText("Judul butir"), "Butir Baru");
    await userEvent.click(screen.getByRole("button", { name: "Tambah butir" }));
    expect(await screen.findByText("Butir V.A.1 sudah ditambahkan.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pecah butir V.A.1" }));
    await userEvent.type(screen.getByLabelText(/Judul butir baru/), "Anak satu{enter}Anak dua");
    await userEvent.click(screen.getByRole("button", { name: "Pecah butir" }));
    expect(await screen.findByText("Anak dua")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ubah butir V.A.1.2" })).toBeInTheDocument();

    // Butir yang masih punya anak tidak bisa dihapus.
    await userEvent.click(screen.getByRole("button", { name: "Hapus butir V.A.1" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("masih punya anak");

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan butir V.A.1.1" }));
    expect(await screen.findByRole("button", { name: "Aktifkan butir V.A.1.1" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hapus butir V.A.1.1" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("Butir V.A.1.1 sudah dihapus.")).toBeInTheDocument();
  });
});

describe("Kategori", () => {
  it("dua tab: kategori prioritas dan kategori dokumen", async () => {
    await setup("/admin/kategori");
    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Kategori prioritas RO", "Kategori dokumen"]);

    // Pindahkan C04 dari Kategori 2 ke Kategori 3.
    await screen.findByRole("form", { name: "Kategori 3" });
    await userEvent.click(within(screen.getByRole("form", { name: "Kategori 3" })).getByLabelText("C04 untuk kategori 3"));
    await userEvent.click(screen.getByRole("button", { name: "Simpan kategori 3" }));
    expect(await screen.findByText("Kategori 3 sudah disimpan.")).toBeInTheDocument();
    expect(within(screen.getByRole("form", { name: "Kategori 2" })).getByLabelText("C04 untuk kategori 2")).not.toBeChecked();

    await userEvent.click(screen.getByRole("tab", { name: "Kategori dokumen" }));
    await screen.findByRole("table", { name: "Kategori dokumen" });
    await userEvent.type(screen.getByLabelText("Kode kategori dokumen"), "UU");
    await userEvent.type(screen.getByLabelText("Nama kategori dokumen"), "Undang-Undang");
    await userEvent.click(screen.getByRole("button", { name: "Tambah kategori" }));
    expect(await screen.findByText("Undang-Undang")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ubah kategori UU" }));
    const edit = screen.getByLabelText("Nama baru");
    await userEvent.clear(edit);
    await userEvent.type(edit, "UU Dasar");
    await userEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(await screen.findByText("UU Dasar")).toBeInTheDocument();

    // Kategori yang dipakai dokumen acuan tidak bisa dihapus.
    await userEvent.click(screen.getByRole("button", { name: "Hapus kategori RPJMN" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("masih dipakai");

    await userEvent.click(screen.getByRole("button", { name: "Hapus kategori UU" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("Kategori UU Dasar sudah dihapus.")).toBeInTheDocument();
  });
});

describe("Akun Pengguna", () => {
  it("menambah akun, mengubah peran, menonaktifkan, dan mengatur ulang kata sandi", async () => {
    const client = await setup("/admin/pengguna");
    await screen.findByRole("table", { name: "Daftar akun pengguna" });

    await userEvent.type(screen.getByLabelText("Nama"), "Rocan Dua");
    await userEvent.type(screen.getByLabelText("Email"), "rocan2@contoh.test");
    await userEvent.type(screen.getByLabelText(/Kata sandi awal/), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    expect(await screen.findByText("Rocan Dua")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Peran Rocan Dua"), "SUPER_ADMIN");
    expect(await screen.findByText("Peran Rocan Dua sekarang Super Admin.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan akun Rocan Dua" }));
    expect(await screen.findByRole("button", { name: "Aktifkan akun Rocan Dua" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Atur ulang kata sandi Rocan Dua" }));
    await userEvent.type(screen.getByLabelText(/Kata sandi baru/), "baru12345");
    await userEvent.click(screen.getByRole("button", { name: "Simpan kata sandi" }));
    expect(await screen.findByText("Kata sandi Rocan Dua sudah diatur ulang.")).toBeInTheDocument();

    await client.logout();
    await expect(client.login({ email: "rocan2@contoh.test", password: "baru12345" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    }); // akun nonaktif
  });

  it("admin tidak bisa mengubah atau menonaktifkan akunnya sendiri", async () => {
    const client = await setup("/admin/pengguna");
    await screen.findByRole("table", { name: "Daftar akun pengguna" });
    expect(screen.getByRole("button", { name: "Nonaktifkan akun Contoh Super Admin" })).toBeDisabled();
    expect(screen.getByLabelText("Peran Contoh Super Admin")).toBeDisabled();
    await expect(client.updateUser("u-admin", { active: false })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
