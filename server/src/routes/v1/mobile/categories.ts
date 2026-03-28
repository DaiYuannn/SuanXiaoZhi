import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

// Get all categories for a user
router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);

    // Default system categories + user specific
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

export default router;