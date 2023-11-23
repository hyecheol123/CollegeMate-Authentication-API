/**
 * Define type of Terms and Conditions
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

export default interface TnC {
  version: string;
  createdAt: Date | string;
  content: {
    privacyAct: string;
    termsAndConditions: string;
  };
}
