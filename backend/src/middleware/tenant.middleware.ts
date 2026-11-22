import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { Tenant } from "../entities/Tenant";

export interface TenantRequest extends Request {
    tenant?: Tenant;
}

export const DEFAULT_TENANT_SLUG = "volo";

// Runs on every /api request (mounted before auth) so even public routes
// like login know which operator's data to read/write. A white-labeled app
// build sends its own slug via EXPO_PUBLIC_TENANT_SLUG baked in at build
// time; omitting the header falls back to the original "volo" tenant so
// existing deployments and tests keep working unchanged.
export const resolveTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
    const slug = (req.headers["x-tenant-slug"] as string) || DEFAULT_TENANT_SLUG;
    const tenantRepo = AppDataSource.getRepository(Tenant);

    const tenant = await tenantRepo.findOne({ where: { slug } });
    if (!tenant) {
        return res.status(404).json({ message: `Unknown tenant: ${slug}` });
    }
    if (!tenant.isActive) {
        return res.status(403).json({ message: "This operator's account is currently inactive" });
    }

    req.tenant = tenant;
    next();
};
