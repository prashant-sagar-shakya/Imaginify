"use server"

import { redirect } from "next/navigation";
import Razorpay from "razorpay";
import crypto from "crypto";
import { connectToDatabase } from "../database/mongoose";
import Transaction from "../database/models/transaction.model";
import { handleError } from "../utils";
import { updateCredits } from "./user.actions";

export async function checkoutCredits(transaction: CheckoutTransactionParams) {
  const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const amount = Number(transaction.amount) * 100;

  const options = {
    amount: amount,
    currency: "INR",
    receipt: `receipt_${Math.random().toString(36).substring(7)}`,
    notes: {
      plan: transaction.plan,
      credits: transaction.credits,
      buyerId: transaction.buyerId,
    }
  };

  try {
    const order = await razorpay.orders.create(options);
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    handleError(error);
  }
}

export async function verifyTransaction({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  transaction,
}: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  transaction: CreateTransactionParams;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    return await createTransaction(transaction);
  } else {
    throw new Error("Payment verification failed");
  }
}

export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    await connectToDatabase();

    // Create a new transaction with a buyerId
    const newTransaction = await Transaction.create({
      ...transaction,
      buyer: transaction.buyerId,
    });

    await updateCredits(transaction.buyerId, transaction.credits);

    return JSON.parse(JSON.stringify(newTransaction));
  } catch (error) {
    handleError(error);
  }
}
