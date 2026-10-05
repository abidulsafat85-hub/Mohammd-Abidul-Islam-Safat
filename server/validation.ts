import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'সঠিক ইমেইল বা আইডি লিখুন'),
  password: z.string().min(1, 'পাসওয়ার্ড আবশ্যক'),
});

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'পূর্ণ নাম আবশ্যক').max(100),
  email: z.string().email('সঠিক ইমেইল ঠিকানা দিন'),
  phone: z.string().regex(/^(\+?880|0)?1[3-9]\d{8}$/, 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন (০১৭XXXXXXXX)'),
  address: z.string().min(1, 'ঠিকানা বা মেস রুম আবশ্যক').max(300),
  studentId: z.string().max(50).optional(),
  parentPhone: z.string().optional(),
  password: z.string().min(4, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে'),
  pin: z.string().regex(/^\d{4,6}$/, 'পিন ৪ থেকে ৬ ডিজিটের সংখ্যা হতে হবে').optional().default('1234'),
});

export const DepositRequestSchema = z
  .object({
    amount: z.number().positive('টাকার পরিমাণ শূন্যের বেশি হতে হবে').max(100000, 'টাকার পরিমাণ সর্বোচ্চ ১,০০,০০০ হতে পারে'),
    paymentMethod: z.enum(['bKash', 'Nagad', 'Rocket', 'Bank', 'Cash']),
    transactionId: z.string().max(60).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'সঠিক তারিখ দিন'),
    note: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      if (['bKash', 'Nagad', 'Rocket'].includes(data.paymentMethod)) {
        return Boolean(data.transactionId && data.transactionId.trim().length >= 4);
      }
      return true;
    },
    {
      message: 'মোবাইল পেমেন্টের জন্য ট্রানজেকশন আইডি আবশ্যক (কমপক্ষে ৪ অক্ষর)',
      path: ['transactionId'],
    }
  );

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'বর্তমান পাসওয়ার্ড আবশ্যক'),
  newPassword: z.string().min(8, 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'),
});

export const OrderSchema = z.object({
  customerName: z.string().min(2, 'আপনার নাম লিখুন').max(60),
  phone: z.string().regex(/^(\+?880|0)?1[3-9]\d{8}$/, 'সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)'),
  deliveryAddress: z.string().min(5, 'সম্পূর্ণ ডেলিভারি ঠিকানা দিন').max(200),
  deliveryArea: z.string().min(2, 'ডেলিভারি এলাকা নির্বাচন করুন'),
  mealType: z.enum(['lunch', 'dinner', 'both']),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'সঠিক তারিখ দিন'),
  deliveryTimeSlot: z.string().min(2, 'সময় নির্বাচন করুন'),
  portions: z.number().int().min(1, 'কমপক্ষে ১ টি মিল অর্ডার করতে হবে').max(100),
  menuChoice: z.string().max(200).optional(),
  estimatedPrice: z.number().min(0).default(0),
  note: z.string().max(300).optional(),
  honeypot: z.string().max(0).optional(),
});

export const MealEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealCount: z.number().min(0).max(10),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
});

export const BazarSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1, 'বিবরণ লিখুন'),
  category: z.string().default('Grocery'),
  amount: z.number().positive('টাকার পরিমাণ ধনাত্মক হতে হবে'),
  paidByMemberId: z.string().default('MESS_FUND'),
  note: z.string().optional(),
});

export const DepositSchema = z.object({
  memberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive('টাকার পরিমাণ ধনাত্মক হতে হবে'),
  paymentMethod: z.string().default('Cash'),
  note: z.string().optional(),
});
