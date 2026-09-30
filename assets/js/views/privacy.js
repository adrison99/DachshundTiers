export function render(root) {
  root.innerHTML = `
    <div class="prose">
      <h1 class="page-title">Ochrana soukromí</h1>
      <p class="page-sub">Co web dělá s údaji.</p>
      <h2>Co web nesbírá</h2>
      <p>Web nemá účty, nepoužívá cookies ani analytiku a o návštěvnících nic neukládá.</p>
      <h2>Co web zobrazuje</h2>
      <p>Zobrazuje pouze veřejná data tierlistu: jméno hráče ve hře, jeho tiery a historii testů.</p>
      <h2>Externí služby</h2>
      <p>Hlavy hráčů se načítají ze služby visage.surgeplay.com, písma z Google Fonts a data z databáze Supabase. Tyto služby při načtení vidí IP adresu návštěvníka, jak je u webových stránek obvyklé.</p>
    </div>`;
}
