// Seed-дані для UX-прототипу. Тільки приклади — без реальних даних.
// Використовуються mock-store для CRUD-операцій.

import type { WorkerOut } from "../requests/worker/types";
import type { FacilityOut } from "../requests/facility/types";
import type { FacilityTypeOut } from "../requests/facility-type/types";
import type { WorkTaskOut } from "../requests/work-task/types";
import type { Vehicle, VehicleReservationRequestOut } from "../requests/vehicle/types";
import type { WorkProcessStartOut, WorkProcessEndOut } from "../requests/work/types";
import type { WorkShiftOut } from "../requests/work-shift/types";
import type { CommentOut } from "../requests/comment/types";
import type { AdjustmentOut } from "../requests/adjustment/types";

const NOW = new Date().toISOString();
const TODAY = new Date();
const dayAgo = (days: number) => new Date(TODAY.getTime() - days * 86400_000).toISOString();

// === Facility Types (категорії об'єктів) ===
export const SEED_FACILITY_TYPES: FacilityTypeOut[] = [
  { id: 1, name: "Жилий будинок", description: "Сантехніка та опалення в житлових будинках", created_at: dayAgo(60), updated_at: dayAgo(60) },
  { id: 2, name: "Комерція", description: "Офіси, магазини, ресторани", created_at: dayAgo(60), updated_at: dayAgo(60) },
  { id: 3, name: "Промисловий", description: "Заводи, склади", created_at: dayAgo(60), updated_at: dayAgo(60) },
  { id: 4, name: "Соціальний", description: "Школи, лікарні, дитячі садки", created_at: dayAgo(60), updated_at: dayAgo(60) },
];

// === Workers (працівники з різними ролями) ===
export const SEED_WORKERS: WorkerOut[] = [
  {
    id: 1, first_name: "Іван", last_name: "Петренко", telegram_id: 1359929127, username: "ivan_p",
    language_code: "uk", worker_type: "admin", rate: 25, email: "ivan@skybud.de", crm_id: "crm-001",
    birthday: "1985-03-15T00:00:00Z", created_at: dayAgo(365), updated_at: NOW,
  },
  {
    id: 2, first_name: "Олена", last_name: "Шевченко", telegram_id: 222333444, username: "olena_sh",
    language_code: "uk", worker_type: "worker", rate: 18, email: "olena@skybud.de", crm_id: "crm-002",
    birthday: "1990-07-22T00:00:00Z", created_at: dayAgo(180), updated_at: NOW,
  },
  {
    id: 3, first_name: "Михайло", last_name: "Коваленко", telegram_id: 333444555, username: "mike_k",
    language_code: "de", worker_type: "master", rate: 22, email: "mike@skybud.de", crm_id: "crm-003",
    birthday: "1988-11-05T00:00:00Z", created_at: dayAgo(200), updated_at: NOW,
  },
  {
    id: 4, first_name: "Hans", last_name: "Müller", telegram_id: 444555666, username: "hans_m",
    language_code: "de", worker_type: "foreman", rate: 28, email: "hans@skybud.de", crm_id: "crm-004",
    birthday: "1980-04-12T00:00:00Z", created_at: dayAgo(400), updated_at: NOW,
  },
  {
    id: 5, first_name: "Anna", last_name: "Schmidt", telegram_id: 555666777, username: "anna_s",
    language_code: "de", worker_type: "engineer", rate: 30, email: "anna@skybud.de", crm_id: "crm-005",
    birthday: "1992-09-30T00:00:00Z", created_at: dayAgo(150), updated_at: NOW,
  },
  {
    id: 6, first_name: "Klaus", last_name: "Fischer", telegram_id: 666777888, username: "klaus_f",
    language_code: "de", worker_type: "assistant", rate: 16, email: "klaus@skybud.de", crm_id: "crm-006",
    birthday: "1995-02-18T00:00:00Z", created_at: dayAgo(90), updated_at: NOW,
  },
  {
    id: 7, first_name: "Sofia", last_name: "Bauer", telegram_id: 777888999, username: "sofia_b",
    language_code: "de", worker_type: "smm", rate: 20, email: "sofia@skybud.de", crm_id: "crm-007",
    birthday: "1996-06-08T00:00:00Z", created_at: dayAgo(60), updated_at: NOW,
  },
  {
    id: 8, first_name: "Peter", last_name: "Wagner", telegram_id: 888999111, username: "peter_w",
    language_code: "de", worker_type: "worker", rate: 17, email: "peter@skybud.de", crm_id: "crm-008",
    birthday: "1987-12-03T00:00:00Z", created_at: dayAgo(250), updated_at: NOW,
  },
];

// За замовчуванням — користувач який заходить (можна змінювати через MockModeSwitcher)
export const SEED_DEFAULT_USER_ID = 2; // Олена як основний

// === Facilities (об'єкти) ===
export const SEED_FACILITIES: FacilityOut[] = [
  {
    id: 1, name: "Müllerstraße 12", group_id: 100001, invite_link: "https://t.me/+facility1",
    status_active: true, latitude: 52.5200, longitude: 13.4050, facility_type_id: 1,
    facility_type: SEED_FACILITY_TYPES[0],
    budget: { id: 11, total_budget: 50000, salary_budget: 30000, vehicle_budget: 5000, created_at: dayAgo(30), updated_at: dayAgo(5) },
    created_at: dayAgo(30), updated_at: dayAgo(5),
  },
  {
    id: 2, name: "Hauptstraße 45", group_id: 100002, invite_link: "https://t.me/+facility2",
    status_active: true, latitude: 52.5100, longitude: 13.3900, facility_type_id: 1,
    facility_type: SEED_FACILITY_TYPES[0],
    budget: { id: 12, total_budget: 75000, salary_budget: 45000, vehicle_budget: 7000, created_at: dayAgo(20), updated_at: dayAgo(2) },
    created_at: dayAgo(20), updated_at: dayAgo(2),
  },
  {
    id: 3, name: "Café Bäckerei Schmidt", group_id: 100003, invite_link: null,
    status_active: true, latitude: 52.5300, longitude: 13.4100, facility_type_id: 2,
    facility_type: SEED_FACILITY_TYPES[1],
    budget: null,
    created_at: dayAgo(15), updated_at: dayAgo(1),
  },
  {
    id: 4, name: "Bürohaus Kreuzberg", group_id: 100004, invite_link: "https://t.me/+facility4",
    status_active: true, latitude: 52.4980, longitude: 13.4030, facility_type_id: 2,
    facility_type: SEED_FACILITY_TYPES[1],
    budget: { id: 14, total_budget: 120000, salary_budget: 70000, vehicle_budget: 10000, created_at: dayAgo(45), updated_at: dayAgo(10) },
    created_at: dayAgo(45), updated_at: dayAgo(10),
  },
  {
    id: 5, name: "Schule am Park", group_id: 100005, invite_link: null,
    status_active: false, latitude: 52.5400, longitude: 13.3800, facility_type_id: 4,
    facility_type: SEED_FACILITY_TYPES[3],
    budget: null,
    created_at: dayAgo(120), updated_at: dayAgo(60),
  },
  {
    id: 6, name: "Lagerhaus Spandau", group_id: 100006, invite_link: null,
    status_active: true, latitude: 52.5450, longitude: 13.2090, facility_type_id: 3,
    facility_type: SEED_FACILITY_TYPES[2],
    budget: null,
    created_at: dayAgo(75), updated_at: dayAgo(30),
  },
];

// === Vehicles (службові авто) ===
export const SEED_VEHICLES: Vehicle[] = [
  { id: 1, license_plate: "B-SK 1234", model: "VW Transporter T6", external_id: 5001, owner_id: null },
  { id: 2, license_plate: "B-SK 5678", model: "Ford Transit Custom", external_id: 5002, owner_id: 4 }, // Hans
  { id: 3, license_plate: "B-SK 9012", model: "Mercedes Sprinter", external_id: 5003, owner_id: null },
  { id: 4, license_plate: "B-SK 3456", model: "Renault Master", external_id: 5004, owner_id: null },
  { id: 5, license_plate: "B-SK 7890", model: "Fiat Ducato", external_id: 5005, owner_id: null },
];

// === Vehicle Reservation Requests ===
export const SEED_VEHICLE_REQUESTS: VehicleReservationRequestOut[] = [
  {
    id: 1, worker_id: 2, vehicle_id: 1, status: "pending",
    worker: { id: 2, first_name: "Олена", last_name: "Шевченко", telegram_id: 222333444, email: "olena@skybud.de" },
    date_from: TODAY.toISOString().split("T")[0],
    date_to: new Date(TODAY.getTime() + 3 * 86400_000).toISOString().split("T")[0],
    rejection_reason: null, created_at: dayAgo(0), updated_at: dayAgo(0),
  },
  {
    id: 2, worker_id: 3, vehicle_id: 4, status: "approved",
    worker: { id: 3, first_name: "Михайло", last_name: "Коваленко", telegram_id: 333444555, email: "mike@skybud.de" },
    date_from: dayAgo(2).split("T")[0],
    date_to: new Date(TODAY.getTime() + 5 * 86400_000).toISOString().split("T")[0],
    rejection_reason: null, created_at: dayAgo(2), updated_at: dayAgo(1),
  },
];

// === Work Tasks (завдання) ===
export const SEED_WORK_TASKS: WorkTaskOut[] = [
  { id: 1, facility_id: 1, facility_type_id: 1, text: "Замінити змішувач на кухні", finished: false, photo_url: null, worker_id: 2, expires_at: new Date(TODAY.getTime() + 86400_000).toISOString(), expired: false, created_at: dayAgo(2), updated_at: dayAgo(2) },
  { id: 2, facility_id: 1, facility_type_id: 1, text: "Перевірити герметизацію душу", finished: true, photo_url: null, worker_id: 2, expires_at: null, expired: false, created_at: dayAgo(3), updated_at: dayAgo(1) },
  { id: 3, facility_id: 1, facility_type_id: 1, text: "Очистити фільтр бойлера", finished: false, photo_url: null, worker_id: null, expires_at: new Date(TODAY.getTime() + 3 * 86400_000).toISOString(), expired: false, created_at: dayAgo(1), updated_at: dayAgo(1) },
  { id: 4, facility_id: 2, facility_type_id: 1, text: "Встановити радіатор у спальні", finished: false, photo_url: null, worker_id: 3, expires_at: null, expired: false, created_at: dayAgo(5), updated_at: dayAgo(5) },
  { id: 5, facility_id: 4, facility_type_id: 2, text: "Налаштувати теплообмінник", finished: false, photo_url: null, worker_id: null, expires_at: dayAgo(-2), expired: true, created_at: dayAgo(7), updated_at: dayAgo(7) },
  { id: 6, facility_id: 3, facility_type_id: 2, text: "Прочистити каналізацію", finished: true, photo_url: null, worker_id: 8, expires_at: null, expired: false, created_at: dayAgo(10), updated_at: dayAgo(8) },
];

// === Comments на роботи ===
export const SEED_COMMENTS: CommentOut[] = [
  { id: 1, worker_process_id: 1, text: "Все виконано згідно плану", created_at: dayAgo(2), updated_at: dayAgo(2) },
  { id: 2, worker_process_id: 1, text: "Знайдена додаткова проблема — погоджено з менеджером", created_at: dayAgo(2), updated_at: dayAgo(2) },
];

// === Work Processes (історія робіт) ===
export const SEED_WORK_PROCESSES: (WorkProcessStartOut | WorkProcessEndOut)[] = [
  {
    id: 1, worker_id: 2, facility_id: 1,
    start_time: dayAgo(7), end_time: new Date(new Date(dayAgo(7)).getTime() + 6.5 * 3600_000).toISOString(),
    start_latitude: 52.5200, start_longitude: 13.4050,
    end_latitude: 52.5201, end_longitude: 13.4051,
    status_object_finished: true,
    report_video_url: null, done_work_photos_url: [], instrument_photos_url: [],
    lunch_time: 30 * 60, overtime_time: 0, work_time: 6 * 3600, summary_rate: 108,
    created_at: dayAgo(7), updated_at: dayAgo(7),
  } as WorkProcessEndOut,
  {
    id: 2, worker_id: 2, facility_id: 2,
    start_time: dayAgo(5), end_time: new Date(new Date(dayAgo(5)).getTime() + 7.5 * 3600_000).toISOString(),
    start_latitude: 52.5100, start_longitude: 13.3900,
    end_latitude: 52.5101, end_longitude: 13.3901,
    status_object_finished: false,
    report_video_url: null, done_work_photos_url: [], instrument_photos_url: [],
    lunch_time: 45 * 60, overtime_time: 30 * 60, work_time: 6.25 * 3600, summary_rate: 112.5,
    created_at: dayAgo(5), updated_at: dayAgo(5),
  } as WorkProcessEndOut,
  {
    id: 3, worker_id: 2, facility_id: 4,
    start_time: dayAgo(2), end_time: new Date(new Date(dayAgo(2)).getTime() + 8 * 3600_000).toISOString(),
    start_latitude: 52.4980, start_longitude: 13.4030,
    end_latitude: 52.4981, end_longitude: 13.4031,
    status_object_finished: true,
    report_video_url: null, done_work_photos_url: [], instrument_photos_url: [],
    lunch_time: 60 * 60, overtime_time: 0, work_time: 7 * 3600, summary_rate: 126,
    created_at: dayAgo(2), updated_at: dayAgo(2),
  } as WorkProcessEndOut,
];

// === Work Shifts ===
export const SEED_WORK_SHIFTS: WorkShiftOut[] = [
  // Активна зміна для дефолтного користувача (id=2)
  {
    id: 100, worker_id: 2, start_time: new Date(TODAY.getTime() - 2 * 3600_000).toISOString(),
    start_latitude: 52.5200, start_longitude: 13.4050,
    end_time: null, end_latitude: null, end_longitude: null,
    total_time: null, object_time: 1.5 * 3600, travel_time: 0.5 * 3600,
    summary_rate: null, is_voided: false, void_reason: null,
    created_at: new Date(TODAY.getTime() - 2 * 3600_000).toISOString(),
    updated_at: NOW,
  },
];

// === Adjustments (фінансові коригування) ===
export const SEED_ADJUSTMENTS: AdjustmentOut[] = [
  { id: 1, worker_id: 2, adjustment_type: "award", amount: 50, reason: "За якісну роботу на об'єкті", photo_url: null, created_at: dayAgo(15), updated_at: dayAgo(15) },
  { id: 2, worker_id: 2, adjustment_type: "prepayment", amount: 200, reason: "Аванс на поточний місяць", photo_url: null, created_at: dayAgo(10), updated_at: dayAgo(10) },
  { id: 3, worker_id: 2, adjustment_type: "penalty", amount: 25, reason: "Запізнення на об'єкт", photo_url: null, created_at: dayAgo(5), updated_at: dayAgo(5) },
];
