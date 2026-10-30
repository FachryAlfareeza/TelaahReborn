import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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

async function setup(email = "rocan@contoh.test") {
  const client = createMockClient({ storage: memoryStorage() });
  await client.login({ email, password: "demo1234" });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/rocan/acuan"]}>
        <AuthProvider client={client}>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe("Dokumen Acuan", () => {
  it("menampilkan dokumen per kategori dan bisa mengubah status aktif", async () => {
    await setup();
    await screen.findByRole("heading", { name: "Dokumen Acuan" });
    const rpjmn = await screen.findByRole("table", { name: "Dokumen acuan RPJMN" });
    expect(within(rpjmn).getByText("Contoh: Dokumen RPJMN (fiktif)")).toBeInTheDocument();
    expect(within(rpjmn).getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Belum ada dokumen acuan Renstra")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nonaktifkan Contoh: Dokumen RPJMN (fiktif)" }));
    expect(await screen.findByRole("button", { name: "Aktifkan Contoh: Dokumen RPJMN (fiktif)" })).toBeInTheDocument();
  });

  it("menambah dokumen, melihat rincian, dan menghapus dengan konfirmasi", async () => {
    await setup();
    await screen.findByRole("table", { name: "Dokumen acuan RPJMN" });

    await userEvent.click(screen.getByRole("button", { name: "Tambah dokumen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pilih kategori");

    await userEvent.selectOptions(screen.getByLabelText("Kategori"), "RENSTRA");
    await userEvent.type(screen.getByLabelText("Judul dokumen"), "Renstra Contoh");
    await userEvent.upload(
      screen.getByLabelText("Berkas PDF"),
      new File(["%PDF-1.4"], "renstra.pdf", { type: "application/pdf" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Tambah dokumen" }));
    const renstra = await screen.findByRole("table", { name: "Dokumen acuan Renstra" });
    expect(within(renstra).getByText("Renstra Contoh")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Lihat rincian Renstra Contoh" }));
    expect(screen.getByRole("region", { name: "Rincian dokumen acuan" })).toHaveTextContent("renstra.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Hapus Renstra Contoh" }));
    expect(screen.getByRole("dialog", { name: "Hapus dokumen acuan?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(screen.getByText("Renstra Contoh", { selector: "th" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hapus Renstra Contoh" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("Belum ada dokumen acuan Renstra")).toBeInTheDocument();
  });

  it("Satker tidak boleh membuka halaman ini", async () => {
    await setup("satker@contoh.test");
    expect(await screen.findByRole("heading", { name: /403/ })).toBeInTheDocument();
  });
});
