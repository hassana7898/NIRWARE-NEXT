# NIRWARE NEXT — Mobile Application Specification (`apps/mobile`)

## 1. Overview & Architecture

The mobile application is implemented as a single, unified codebase in `apps/mobile` powered by **React Native**, **Expo**, and **TypeScript**. Rather than fracturing into three disparate apps, the application employs a unified, role-aware architecture serving three primary enterprise personas:

1. **Factory Manager (`MANAGER`)**: Real-time production oversight, KPI monitoring, and order approval.
2. **Poultry Farmer (`FARMER`)**: Flock quota utilization tracking, order submission, and delivery confirmation code (OTP) presentation.
3. **Fleet Driver (`DRIVER`)**: Weighbridge ticket verification, farm navigation, transit status switching, and recipient OTP verification.

---

## 2. Screens & UX Flows

### 2.1 Authentication (`LoginScreen.tsx`)
- Persian-first, RTL-oriented interface.
- Username and password authentication against `/api/v1/auth/login`.
- One-tap quick testing accounts for instant role-switching between Manager, Farmer, and Driver during evaluation.

### 2.2 Manager Dashboard (`ManagerDashboardScreen.tsx`)
- High-level KPIs: Pending orders requiring factory approval, trucks currently on the road, today's feed tonnage produced.
- Actionable order cards: Manager can review feed requests and execute `APPROVE` transitions directly from the mobile device.

### 2.3 Farmer Portal (`FarmerOrdersScreen.tsx`)
- Quota utilization progress bar showing approved kg, consumed kg, and remaining allowance.
- Quick order creation modal with requested feed tonnage and farm delivery address.
- Active order cards featuring the prominent display of the ephemeral 6-digit confirmation OTP when a delivery is in transit.

### 2.4 Driver Delivery Terminal (`DriverDeliveryScreen.tsx`)
- Active dispatch list displaying destination address, farmer contact number, and net feed weight.
- Status transition trigger: "Start Transit / Exit Factory Gate".
- OTP verification modal: Driver inputs the 6-digit code dictated by the farmer upon unloading; verifying the code triggers transactional inventory deduction and order completion.

---

## 3. Hardware Integration & Emulation Boundaries

- **GPS Geolocation**: In native production builds, driver location coordinates are captured via `expo-location`. When running in simulator or headless environments, coordinates default to factory or farm coordinates.
- **Digital Signature**: Farmer recipient signature is captured via canvas touch gestures. Fallback handles signed token serialization.
- **Camera / Barcode Scanner**: Inbound weighbridge scanning is supported via `expo-camera`.
