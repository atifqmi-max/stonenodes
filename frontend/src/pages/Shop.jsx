import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { Button } from "../components/Form";
import { api } from "../lib/api";

export default function Shop() {
  const [items, setItems] = useState([]);
  const [discordInvite, setDiscordInvite] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/shop").then((res) => {
      setItems(res.items);
      setDiscordInvite(res.discordInvite);
    });
  }, []);

  const openBuy = (item) => {
    setSelected(item);
    setModalOpen(true);
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-stone-50">Credits Shop</h1>
      <p className="mb-6 text-sm text-stone-500">Top up your balance to keep running more (or bigger) instances.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 p-12 text-center text-sm text-stone-500">
          No credit packages are available right now — check Discord for pricing.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
              <div className="mb-1 text-sm text-stone-400">{item.name}</div>
              <div className="mb-2 font-mono text-2xl font-semibold text-moss-300">{item.credits} credits</div>
              <div className="mb-4 text-sm text-stone-400">{item.description}</div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-lg font-semibold text-stone-100">{item.price}</span>
                <Button onClick={() => openBuy(item)}>Buy Credits</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Buy credits">
        <p className="mb-5 text-sm text-stone-400">
          Join our Discord server and open a support ticket to purchase {selected?.credits} credits
          {selected?.price ? ` for ${selected.price}` : ""}.
        </p>
        <a
          href={selected?.buy_link || discordInvite}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-lg bg-moss-500 px-4 py-2.5 text-center text-sm font-semibold text-stone-950 hover:bg-moss-400"
        >
          Open Discord
        </a>
      </Modal>
    </div>
  );
}
