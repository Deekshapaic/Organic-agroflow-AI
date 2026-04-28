# Security Specification - AgroFlow

## 1. Data Invariants
- **Users**: A user can only manage their own profile. Roles are immutable once set via the client (Admin override required for changes).
- **Crops**: Only Farmers can create crops. Anyone signed in can view crops. Only the owning Farmer or an Admin can edit/delete.
- **Orders**: A Farmer can accept/reject orders for their crops. A Wholesaler can create orders for crops. A Retailer can create orders for wholesaler stock. State transitions (e.g., requested -> accepted -> shipped -> delivered) must be sequential and authorized.
- **Drivers**: Only Admin can approve drivers. Drivers can update their own status/phone.

## 2. The "Dirty Dozen" Payloads (Unauthorized Attempts)

### User Profiling
1. **Identity Spoofing**: Attempt to create a user profile with a UID different from the authenticated user.
   - `setDoc(doc(db, 'users', 'target-uid'), { role: 'admin', ... })` (Auth: user-uid)
2. **Privilege Escalation**: Attempt to update own role to 'admin'.
   - `updateDoc(doc(db, 'users', 'my-uid'), { role: 'admin' })`

### Crop Management
3. **Ghost Crop**: Create a crop with a mismatched `farmerId`.
   - `addDoc(collection(db, 'crops'), { name: 'Rice', farmerId: 'someone-else', ... })`
4. **Price Poisoning**: Update price of another farmer's crop.
   - `updateDoc(doc(db, 'crops', 'other-crop-id'), { pricePerUnit: 0.01 })`

### Order Integrity
5. **State Skipping**: Manually setting an order to 'delivered' as a buyer without shipment.
   - `updateDoc(doc(db, 'orders', 'order-id'), { status: 'delivered' })` (Auth: Wholesaler)
6. **Relational Sync Break**: Create an order for a non-existent crop.
   - `addDoc(collection(db, 'orders'), { cropId: 'fake-id', ... })`
7. **Unauthorized Acceptance**: Attempt to 'accept' an order for a crop you don't own.
   - `updateDoc(doc(db, 'orders', 'order-id'), { status: 'accepted' })` (Auth: Non-owner Farmer)

### Resource Exhaustion (Denial of Wallet)
8. **String Bomb**: Injecting 1MB of garbage into the `cropId` path or field.
9. **Array Bloom**: Adding 10,000 tags to a crop document.

### PII Protection
10. **Global PII Scrape**: Attempting `getDocs(collection(db, 'users'))` as a regular user to obtain emails/phones.

### Administrative Protocols
11. **Self-Appointed Driver**: Setting own driver status to 'Available' without Admin approval.
   - `addDoc(collection(db, 'drivers'), { status: 'Available', userId: 'my-uid' })`
12. **Orphaned Write**: Creating a delivery assignment for an order that doesn't exist.

## 3. Test Runner
A `firestore.rules.test.ts` will be generated to verify these rejections.
