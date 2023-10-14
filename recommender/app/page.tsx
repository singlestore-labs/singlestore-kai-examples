"use client";
import { useState, useEffect } from "react";

function CartBlock(props: { item: any; index: any; action: any }) {
  return (
    <li key={props.index} className="mb-2">
      <div className="my-2 grid grid-cols-[52px_minmax(300px,_1fr)] items-start divide-y divide-gray-500">
        <div className="border-2 h-full rounded-md">
          <img
            className="object-fill mx-0 my-0 w-12 h-12"
            src={`/images/${encodeURI(
              props.item.title.replace(/[^a-zA-Z0-9.\s_-]/g, "_")
            )}.webp`}
          ></img>
        </div>
        <div className="ml-2 flex flex-col">
          <div className="flex justify-between">
            <div className="line-clamp-1">
              <h2 className="text-xl mt-0 mb-1 line-clamp-1">
                {props.item.title}
              </h2>
            </div>
            <div className="text-right">
              <button
                className="ml-2 mt-1 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                onClick={() => props.action(props.index)}
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function SuggestionBlock(props: { item: any; index: any; action: any }) {
  return (
    <li key={props.index} className="mb-2">
      <div className="my-2 grid grid-cols-[100px_minmax(300px,_1fr)] items-start divide-y divide-gray-500">
        <div className="border-2 h-full rounded-md">
          <img
            className="object-fill mx-0 my-0 w-full"
            src={`/images/${encodeURI(
              props.item.title.replace(/[^a-zA-Z0-9.\s_-]/g, "_")
            )}.webp`}
          ></img>
        </div>
        <div className="ml-2 flex flex-col">
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl mt-0 mb-1 line-clamp-1">
                {props.item.title}
              </h2>
              <p className="line-clamp-1">{props.item.description}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold mb-2">{props.item.price}</p>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                onClick={() => props.action(props.item)}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function Home() {
  const [inputOne, setInputOne] = useState("");
  const [results, setResults] = useState([] as any[]);
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([] as any[]);
  const [suggestedItems, setSuggestedItems] = useState([] as any[]);
  const [isSuggestedItemsChecked, setIsSuggestedItemsChecked] = useState(false);
  const [isSuggestedItemsLoading, setSuggestedItemsLoading] = useState(false);
  const [otherShoppersBought, setOtherShoppersBought] = useState([] as any[]);
  const [otherShoppersBoughtChecked, setOtherShoppersBoughtChecked] =
    useState(false);
  const [isOtherShoppersBoughtLoading, setOtherShoppersBoughtLoading] =
    useState(false);
  const [othersLookingAt, setOthersLookingAt] = useState([] as any[]);
  const [othersLookingAtChecked, setOthersLookingAtChecked] = useState(false);
  const [isOtherLookedAtLoading, setOtherLookedAtLoading] = useState(false);
  const [personalShopper, setPersonalShopper] = useState({} as any);
  const [personalShopperChecked, setPersonalShopperChecked] = useState(false);
  const [isPersonalShopperLoading, setPersonalShopperLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputOne,
        }),
      });

      const results: any[] = await res.json();
      setResults(results);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestedItems = async () => {
    try {
      setSuggestedItemsLoading(true);
      const res = await fetch("/api2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
        }),
      });

      const suggestions: any[] = await res.json();
      setSuggestedItems(suggestions);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setSuggestedItemsLoading(false);
    }
  };

  const getOtherShoppersBought = async () => {
    try {
      setOtherShoppersBoughtLoading(true);
      const res = await fetch("/api3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
        }),
      });

      const otherShoppersItems: any[] = await res.json();
      setOtherShoppersBought(otherShoppersItems);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setOtherShoppersBoughtLoading(false);
    }
  };

  const getOthersLookingAt = async () => {
    try {
      setOtherLookedAtLoading(true);
      const res = await fetch("/api4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
        }),
      });

      const othersLookingAt: any[] = await res.json();
      setOthersLookingAt(othersLookingAt);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setOtherLookedAtLoading(false);
    }
  };

  const getPersonalShopper = async () => {
    try {
      setPersonalShopperLoading(true);
      const res = await fetch("/api5", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
        }),
      });

      const personalShopper: any[] = await res.json();
      setPersonalShopper(personalShopper);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setPersonalShopperLoading(false);
    }
  };

  useEffect(() => {
    if (cart.length > 0) {
      if (isSuggestedItemsChecked) {
        getSuggestedItems();
      } else {
        setSuggestedItems([]);
      }
      if (otherShoppersBoughtChecked) {
        getOtherShoppersBought();
      } else {
        setOtherShoppersBought([]);
      }
      if (othersLookingAtChecked) {
        getOthersLookingAt();
      } else {
        setOthersLookingAt([]);
      }
      if (personalShopperChecked) {
        getPersonalShopper();
      } else {
        setPersonalShopper({});
      }
    } else {
      setSuggestedItems([]);
      setOtherShoppersBought([]);
      setOthersLookingAt([]);
      setPersonalShopper({});
    }
  }, [cart]);

  useEffect(() => {
    if (cart.length > 0) {
      if (isSuggestedItemsChecked) {
        getSuggestedItems();
      } else {
        setSuggestedItems([]);
      }
    } else {
      setSuggestedItems([]);
    }
  }, [isSuggestedItemsChecked]);

  useEffect(() => {
    if (cart.length > 0) {
      if (otherShoppersBoughtChecked) {
        getOtherShoppersBought();
      } else {
        setOtherShoppersBought([]);
      }
    } else {
      setOtherShoppersBought([]);
    }
  }, [otherShoppersBoughtChecked]);

  useEffect(() => {
    if (cart.length > 0) {
      if (othersLookingAtChecked) {
        getOthersLookingAt();
      } else {
        setOthersLookingAt([]);
      }
    } else {
      setOthersLookingAt([]);
    }
  }, [othersLookingAtChecked]);

  useEffect(() => {
    if (cart.length > 0) {
      if (personalShopperChecked) {
        getPersonalShopper();
      } else {
        setPersonalShopper({});
      }
    } else {
      setPersonalShopper({});
    }
  }, [personalShopperChecked]);

  const addToCart = (item: any) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const clearCart = () => {
    setInputOne("");
    setResults([]);
    setCart((prevCart) => []);
    setSuggestedItems([]);
    setOtherShoppersBought([]);
    setOthersLookingAt([]);
    setPersonalShopper({});
    setIsSuggestedItemsChecked(false);
    setOtherShoppersBoughtChecked(false);
    setOthersLookingAtChecked(false);
    setPersonalShopperChecked(false);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-2">
      <div className="prose prose-invert">
        <h1>Welcome to the Single "Store"!</h1>
        <p className="mb-0">What are you looking for?</p>

        <form onSubmit={handleSubmit} className="flex flex-col mb-8">
          <input
            type="text"
            value={inputOne}
            onChange={(e) => setInputOne(e.target.value)}
            className="px-4 py-2 my-2 border border-gray-300 bg-black rounded placeholder-gray-500"
            placeholder="Type here"
            required
          />

          <button
            type="submit"
            className="px-4 py-2 my-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Search
          </button>
        </form>

        <div
          style={{ minHeight: 650 }}
          className={
            isLoading
              ? "animate-pulse bg-purple-950 rounded-md not-prose"
              : "not-prose"
          }
        >
          {results && (
            <ul>
              {results.map((item: any, index: any) => (
                <SuggestionBlock item={item} index={index} action={addToCart} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="ml-8 p-4 border-l">
        <h2 className="text-xl font-bold mb-4">Cart</h2>
        <ul>
          {cart.map((item: any, index: any) => (
            <CartBlock item={item} index={index} action={removeFromCart} />
          ))}
        </ul>
        {cart.length > 0 && (
          <div className="text-right">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
              onClick={() => clearCart()}
            >
              Check Out
            </button>
          </div>
        )}
        {cart.length > 0 && (
          <div>
            <div className="mt-4">
              <input
                type="checkbox"
                id="suggestedItemsCheckbox"
                className="w-4 h-4 mr-1 align-middle"
                checked={isSuggestedItemsChecked}
                onChange={() =>
                  setIsSuggestedItemsChecked(!isSuggestedItemsChecked)
                }
              />
              <label
                htmlFor="suggestedItemsCheckbox"
                className="text-lg font-bold mb-2 align-middle"
              >
                Suggested Items
              </label>
              {isSuggestedItemsChecked && (
                <div
                  style={{ minHeight: 325 }}
                  className={
                    isSuggestedItemsLoading
                      ? "animate-pulse bg-purple-950 rounded-md not-prose"
                      : "not-prose"
                  }
                >
                  <ul>
                    {suggestedItems.map((item: any, index: any) => (
                      <SuggestionBlock
                        item={item}
                        index={index}
                        action={addToCart}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-4">
              <input
                type="checkbox"
                id="otherShoppersBoughtCheckbox"
                className="w-4 h-4 mr-1 align-middle"
                checked={otherShoppersBoughtChecked}
                onChange={() =>
                  setOtherShoppersBoughtChecked(!otherShoppersBoughtChecked)
                }
              />
              <label
                htmlFor="otherShoppersBoughtCheckbox"
                className="text-lg font-bold mb-2 align-middle"
              >
                Other Shoppers Bought
              </label>
              {otherShoppersBoughtChecked && (
                <div
                  style={{ minHeight: 325 }}
                  className={
                    isOtherShoppersBoughtLoading
                      ? "animate-pulse bg-purple-950 rounded-md not-prose"
                      : "not-prose"
                  }
                >
                  <ul>
                    {otherShoppersBought.map((item: any, index: any) => (
                      <SuggestionBlock
                        item={item}
                        index={index}
                        action={addToCart}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-4">
              <input
                type="checkbox"
                id="othersLookingAtCheckbox"
                className="w-4 h-4 mr-1 align-middle"
                checked={othersLookingAtChecked}
                onChange={() =>
                  setOthersLookingAtChecked(!othersLookingAtChecked)
                }
              />
              <label
                htmlFor="othersLookingAtCheckbox"
                className="text-lg font-bold mb-2 align-middle"
              >
                Shoppers Looking At
              </label>
              {othersLookingAtChecked && (
                <div
                  style={{ minHeight: 325 }}
                  className={
                    isOtherLookedAtLoading
                      ? "animate-pulse bg-purple-950 rounded-md not-prose"
                      : "not-prose"
                  }
                >
                  <ul>
                    {othersLookingAt.map((item: any, index: any) => (
                      <SuggestionBlock
                        item={item}
                        index={index}
                        action={addToCart}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-4">
              <input
                type="checkbox"
                id="personalShopperCheckbox"
                className="w-4 h-4 mr-1 align-middle"
                checked={personalShopperChecked}
                onChange={() =>
                  setPersonalShopperChecked(!personalShopperChecked)
                }
              />
              <label
                htmlFor="personalShopperCheckbox"
                className="text-lg font-bold mb-2 align-middle"
              >
                Personal Shopper
              </label>
              {personalShopperChecked && (
                <div
                  style={{ minHeight: 400 }}
                  className={
                    isPersonalShopperLoading
                      ? "animate-pulse bg-purple-950 rounded-md not-prose"
                      : "not-prose"
                  }
                >
                  {typeof personalShopper === "object" && (
                    <ul>
                      <p className="text-md pt-2">
                        {personalShopper?.a === undefined
                          ? ""
                          : "🤔 " + personalShopper?.a}
                      </p>
                      <p className="py-2">
                        {personalShopper?.c === undefined
                          ? ""
                          : "🎉 " + personalShopper?.c}
                      </p>
                      <p>
                        <a
                          className="underline"
                          href="#"
                          onClick={getPersonalShopper}
                        >
                          {personalShopper?.c === undefined
                            ? ""
                            : "Get another suggestion"}
                        </a>
                      </p>
                      {personalShopper.b?.map((item: any, index: any) => (
                        <SuggestionBlock
                          item={item}
                          index={index}
                          action={addToCart}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
