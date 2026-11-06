import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupApp } from "../../test/setupApp";

describe("akun pengguna (Super Admin)", () => {
  it("akun Satker wajib memilih unit dari Master RO", async () => {
    await setupApp("/admin/pengguna", "super_admin");
    await screen.findByRole("table", { name: "Akun pengguna" });
    await userEvent.click(screen.getByRole("button", { name: "Tambah akun" }));
    await userEvent.type(screen.getByLabelText("NIP"), "200001012025011009");
    await userEvent.type(screen.getByLabelText("Nama"), "Satker Baru");
    await userEvent.type(screen.getByLabelText("Kata sandi awal"), "katasandi1");
    await userEvent.click(screen.getByRole("button", { name: "Buat akun" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unit Eselon I dan II");

    const unit = await screen.findByLabelText("Unit Eselon I / II");
    await waitFor(() => expect(within(unit).getAllByRole("option").length).toBeGreaterThan(1));
    await userEvent.selectOptions(unit, "005|005.02");
    await userEvent.click(screen.getByRole("button", { name: "Buat akun" }));
    expect(await screen.findByRole("rowheader", { name: "Satker Baru" })).toBeInTheDocument();
  });

  it("menonaktifkan akun meminta konfirmasi", async () => {
    await setupApp("/admin/pengguna", "super_admin");
    await userEvent.click(await screen.findByRole("button", { name: "Nonaktifkan akun Contoh Satker Kemitraan" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Ya, nonaktifkan" }));
    expect(await screen.findByText("Akun Contoh Satker Kemitraan dinonaktifkan.")).toBeInTheDocument();
  });
});
