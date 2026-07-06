"use client";

import { useEffect } from "react";
import Script from "next/script";

import { useToast } from "@/components/ui/use-toast";
import { checkoutCredits, verifyTransaction } from "@/lib/actions/transaction.action";

import { Button } from "../ui/button";

const Checkout = ({
  plan,
  amount,
  credits,
  buyerId,
}: {
  plan: string;
  amount: number;
  credits: number;
  buyerId: string;
}) => {
  const { toast } = useToast();

  const onCheckout = async () => {
    const transaction = {
      plan,
      amount,
      credits,
      buyerId,
    };

    const order = await checkoutCredits(transaction);

    if (!order) {
      toast({
        title: "Order creation failed",
        description: "Could not initiate payment. Please try again later.",
        duration: 5000,
        className: "error-toast",
      });
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Imaginify",
      description: `Payment for ${plan}`,
      order_id: order.id,
      handler: async function (response: any) {
        try {
          const verifyData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            transaction: {
              razorpayId: response.razorpay_payment_id,
              amount: amount,
              plan: plan,
              credits: credits,
              buyerId: buyerId,
              createdAt: new Date(),
            },
          };

          await verifyTransaction(verifyData);

          toast({
            title: "Order placed!",
            description: "Your credits have been updated successfully.",
            duration: 5000,
            className: "success-toast",
          });
          
          window.location.href = "/profile";
        } catch (error) {
          console.error("Payment verification failed", error);
          toast({
            title: "Payment verification failed!",
            description: "Please contact support if amount was deducted.",
            duration: 5000,
            className: "error-toast",
          });
        }
      },
      prefill: {
        name: "Imaginify User",
      },
      theme: {
        color: "#8B5CF6",
      },
    };

    const rzp1 = new (window as any).Razorpay(options);
    rzp1.on("payment.failed", function (response: any) {
      toast({
        title: "Order canceled!",
        description: "Payment failed or was canceled.",
        duration: 5000,
        className: "error-toast",
      });
    });

    rzp1.open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <section>
        <Button
          onClick={onCheckout}
          type="button"
          role="button"
          className="w-full rounded-full bg-purple-gradient bg-cover"
        >
          Buy Credit
        </Button>
      </section>
    </>
  );
};

export default Checkout;
