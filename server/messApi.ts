import { Router, Request, Response } from 'express';
import { MessStore } from './messStore';
import {
  requireAuth,
  requireAdmin,
  requireMemberOrAdmin,
  signAuthToken,
  setTokenCookie,
  clearTokenCookie,
  authRateLimiter,
} from './auth';

export const messRouter = Router();
const store = MessStore.getInstance();

// 1. Get full state (Admin Only: Protected by requireAdmin)
messRouter.get('/state', requireAdmin, (req: Request, res: Response) => {
  try {
    const state = store.getSanitizedState();
    res.json({ success: true, data: state });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Sync full state (Admin Only: Protected by requireAdmin)
messRouter.post('/sync', requireAdmin, (req: Request, res: Response) => {
  try {
    const { members, meals, bazar, deposits, fixedExpenses, settings } = req.body;
    const updated = store.setState({
      ...(members ? { members } : {}),
      ...(meals ? { meals } : {}),
      ...(bazar ? { bazar } : {}),
      ...(deposits ? { deposits } : {}),
      ...(fixedExpenses ? { fixedExpenses } : {}),
      ...(settings ? { settings } : {}),
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Public member listing for Member Selector (Returns ONLY id and name; NO phone, password, pin)
messRouter.get('/members-list', (req: Request, res: Response) => {
  try {
    const state = store.getRawState();
    const list = (state.members || [])
      .filter((m: any) => m.isActive)
      .map((m: any) => ({
        id: m.id,
        name: m.fullName || m.nickname || 'Member',
      }));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3b. Public Branding endpoint (Returns ONLY appName and logo so login screen can show them before login)
messRouter.get('/branding', (req: Request, res: Response) => {
  try {
    const branding = store.getBranding();
    res.json({
      success: true,
      data: {
        appName: branding.appName || 'MessMate',
        logo: branding.logo || undefined,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3c. Admin update branding (App Name & Logo): Protected by requireAdmin
messRouter.post('/admin/branding', requireAdmin, (req: Request, res: Response) => {
  try {
    const { appName, logo } = req.body;

    if (logo) {
      if (typeof logo !== 'string' || !logo.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          error: 'অবৈধ ফাইল ফরম্যাট! শুধুমাত্র PNG, JPG বা WebP ইমেজ আপলোড করুন।',
        });
      }

      const mimeType = logo.substring(5, logo.indexOf(';'));
      if (mimeType === 'image/svg+xml' || logo.includes('image/svg')) {
        return res.status(400).json({
          success: false,
          error: 'SVG ফাইল গ্রহণযোগ্য নয়। শুধুমাত্র PNG, JPG অথবা WebP আপলোড করুন।',
        });
      }

      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimeType)) {
        return res.status(400).json({
          success: false,
          error: 'শুধুমাত্র PNG, JPG বা WebP ইমেজ ফাইল আপলোড করা যাবে।',
        });
      }

      // Check max size 500 KB
      const base64Str = logo.split(',')[1] || '';
      const sizeInBytes = Math.ceil((base64Str.length * 3) / 4);
      if (sizeInBytes > 500 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'লোগো ফাইল সর্বোচ্চ ৫০০ KB হতে পারে (File exceeds 500 KB limit)।',
        });
      }
    }

    const updated = store.updateBranding(appName, logo);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Verify Admin PIN (Rate-limited: Max 5 tries per 15 min)
messRouter.post('/verify-admin', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    const isVerified = store.verifyAdminPin(pin);

    if (isVerified) {
      const token = signAuthToken({
        userId: 'admin-1',
        memberId: 'mem-1',
        email: 'abidulsafat85@gmail.com',
        role: 'admin',
        mustChangePassword: false,
      });
      setTokenCookie(res, token);
      res.json({ success: true, verified: true, token });
    } else {
      res.status(401).json({ success: false, error: 'ভুল এডমিন পিন! আবার চেষ্টা করুন।' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Verify Member PIN & Login (Rate-limited: Max 5 tries per 15 min)
messRouter.post('/verify-member', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { memberId, pin } = req.body;
    const { verified, member } = store.verifyMemberPin(memberId, pin);

    if (verified && member) {
      const token = signAuthToken({
        userId: member.id,
        memberId: member.id,
        email: member.email,
        role: 'member',
      });
      setTokenCookie(res, token);
      res.json({
        success: true,
        verified: true,
        memberId: member.id,
        fullName: member.fullName,
        token,
      });
    } else {
      res.status(401).json({ success: false, error: 'ভুল পিন কোড! আপনার সঠিক পিন দিন।' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get isolated data for an individual member (STRICT ISOLATION: Member can only access their own id; Admin allowed)
messRouter.get('/member/:memberId', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const isolatedData = store.getIsolatedMemberData(memberId, month);

    if (!isolatedData) {
      return res.status(404).json({ success: false, error: 'মেম্বার খুঁজে পাওয়া যায়নি।' });
    }

    res.json({ success: true, data: isolatedData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Member updates their own meal for a date (Requires member or admin auth)
messRouter.post('/member/:memberId/meal', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { date, mealCount, lunch, dinner } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    const updatedRecord = store.updateMemberMeal(
      date,
      memberId,
      Number(mealCount) || 0,
      lunch,
      dinner
    );

    res.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Member records a deposit (Requires member or admin auth)
messRouter.post('/member/:memberId/deposit', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { amount, paymentMethod, note, date } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'সঠিক জমার পরিমাণ লিখুন।' });
    }

    const newDep = store.addDeposit({
      memberId,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'bKash',
      note: note || 'Self-submitted Deposit',
      date: date || new Date().toISOString().split('T')[0],
    });

    res.json({ success: true, data: newDep });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Member records a bazar expense (Requires member or admin auth)
messRouter.post('/member/:memberId/bazar', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { amount, description, category, date, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'সঠিক খরচের পরিমাণ লিখুন।' });
    }

    const newBazar = store.addBazar({
      paidByMemberId: memberId,
      amount: Number(amount),
      description: description || 'বাজারের সওদা',
      category: category || 'Grocery',
      date: date || new Date().toISOString().split('T')[0],
      note: note || '',
    });

    res.json({ success: true, data: newBazar });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Member advance vote for tomorrow's meal (Requires member or admin auth)
messRouter.post('/member/:memberId/advance-vote', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { choice, targetDate } = req.body;

    if (!choice || !targetDate) {
      return res.status(400).json({ success: false, error: 'Choice and targetDate are required' });
    }

    const vote = store.setTomorrowVote(memberId, choice, targetDate);
    res.json({ success: true, data: vote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Member changes their personal PIN (Requirement 12: Changing a PIN MUST require the old PIN)
messRouter.post('/member/:memberId/pin', requireMemberOrAdmin, (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { oldPin, newPin } = req.body;

    if (!oldPin) {
      return res.status(400).json({ success: false, error: 'বর্তমান পিন দেওয়া আবশ্যক (Old PIN is required).' });
    }

    if (!newPin || String(newPin).length < 4) {
      return res.status(400).json({ success: false, error: 'নতুন পিন কমপক্ষে ৪ ডিজিটের হতে হবে।' });
    }

    const result = store.updateMemberPin(memberId, String(oldPin), String(newPin));
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({ success: true, message: 'পিন সফলভাবে পরিবর্তন হয়েছে।' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Admin changes Admin PIN (Admin Only: Protected by requireAdmin)
messRouter.post('/admin/pin', requireAdmin, (req: Request, res: Response) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin) {
      return res.status(400).json({ success: false, error: 'বর্তমান এডমিন পিন দেওয়া আবশ্যক।' });
    }

    if (!newPin || String(newPin).length < 4) {
      return res.status(400).json({ success: false, error: 'এডমিন পিন কমপক্ষে ৪ ডিজিটের হতে হবে।' });
    }

    const result = store.updateAdminPin(String(oldPin), String(newPin));
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({ success: true, message: 'এডমিন পিন সফলভাবে আপডেট হয়েছে।' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. Authentication: Email & Password Login (Rate-limited: Max 5 tries per 15 min)
// Issues a signed JWT in an httpOnly cookie
messRouter.post('/auth/login', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = store.loginUser(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    // Issue signed JWT in an httpOnly cookie
    const token = signAuthToken({
      userId: result.user.id,
      memberId: result.memberId || result.user.id,
      email: result.user.email,
      role: result.role,
      mustChangePassword: result.mustChangePassword,
    });

    setTokenCookie(res, token);

    res.json({
      ...result,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. First Admin Login: Forced Password Change (Cannot open admin panel until password is changed)
messRouter.post('/auth/admin-first-change-password', requireAuth, (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (currentUser.role !== 'admin' || currentUser.email !== 'abidulsafat85@gmail.com') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { newPassword } = req.body;
    const result = store.adminFirstChangePassword(newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Issue updated JWT with mustChangePassword = false
    const token = signAuthToken({
      userId: currentUser.userId,
      memberId: currentUser.memberId,
      email: currentUser.email,
      role: 'admin',
      mustChangePassword: false,
    });

    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। এখন এডমিন প্যানেলে প্রবেশ করতে পারেন।',
      token,
      mustChangePassword: false,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. Admin Settings: Change Password (Requires current password)
messRouter.post('/auth/admin-change-password', requireAdmin, (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = store.adminChangePassword(currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'এডমিন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. Get current logged in user from session
messRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 17. Logout (Clears httpOnly cookie)
messRouter.post('/auth/logout', (req: Request, res: Response) => {
  try {
    clearTokenCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
