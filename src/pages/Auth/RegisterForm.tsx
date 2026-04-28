// src/pages/Auth/RegisterForm.tsx
import {useEffect, useMemo, useState, useRef} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'react-redux';
import './RegisterForm.css';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import {setUser} from '../../store/slice';
import {toastError, toastSuccess} from '../../lib/toasts';
import i18n from '../../i18n/config';
import axios from 'axios';

import guidePdf from '../../assets/measure-guide.pdf';
import { getApiUrl } from '../../lib/apiConfig';
import { BOT_API_URL, BOT_API_TOKEN } from '../../lib/env';


const MAX_FILES = 5;
type Step = 1 | 2 | 3 | 4;

const DRAFT_KEY = 'registerDraft_v1';

type BankType = 'iban' | 'sepa' | 'swift' | 'swift_transfer' | 'ach' | 'wire_us' | 'sort_code' | 'transit_ca' | 'bsb' | 'zengin' | 'cnaps' | 'pan' | '';

const RegisterForm = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState<Step>(1);

  // Telegram data
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [, setLanguageCode] = useState('');

  // Required fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Регистрационные поля
  const [firstName, setFirstName] = useState('');      // first_name
  const [lastName, setLastName] = useState('');        // last_name
  const [birthDate, setBirthDate] = useState('');      // YYYY-MM-DD
  const [phoneNumber, setPhoneNumber] = useState('');  // phone_number
  const [homeAddress, setHomeAddress] = useState('');  // home_address
  const [emergencyName, setEmergencyName] = useState('');   // emergency_relative_name
  const [emergencyPhone, setEmergencyPhone] = useState(''); // emergency_relative_phone

  // Банковские данные
  const [bankType, setBankType] = useState<BankType>(''); // Тип платежной системы
  const [bankAccountHolder, setBankAccountHolder] = useState(''); // Держатель счета
  const [bankName, setBankName] = useState(''); // Название банка
  const [iban, setIban] = useState(''); // IBAN
  const [bic, setBic] = useState(''); // BIC/SWIFT код
  const [accountNumber, setAccountNumber] = useState(''); // Номер счета
  const [routingNumber, setRoutingNumber] = useState(''); // Routing Number (ACH, Wire Transfer)
  const [sortCode, setSortCode] = useState(''); // Sort Code (UK) - формат: 12-34-56
  const [transitNumber, setTransitNumber] = useState(''); // Transit Number (Канада) - формат: #####-###
  const [bsbNumber, setBsbNumber] = useState(''); // BSB (Австралия) - 6 цифр
  const [bankCode, setBankCode] = useState(''); // Bank Code (Zengin)
  const [branchCode, setBranchCode] = useState(''); // Branch Code (Zengin)
  const [cnapsCode, setCnapsCode] = useState(''); // CNAPS (Китай) - 12 цифр
  const [cardNumber, setCardNumber] = useState(''); // PAN (Card Number) - 16-19 цифр

  // Измерения
  const [heightCm, setHeightCm] = useState<string>(''); // height_cm (0-300)
  const [chestCm, setChestCm] = useState<string>('');   // chest_cm (0-300)
  const [hipsCm, setHipsCm] = useState<string>('');     // hips_cm (0-300)
  const [inseamCm, setInseamCm] = useState<string>(''); // inseam_cm (0-150)
  const [topWaistCm, setTopWaistCm] = useState<string>(''); // top_waist_cm (0-300)
  const [pantsWaistCm, setPantsWaistCm] = useState<string>(''); // pants_waist_cm (0-300)
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<string>(''); // head_circumference_cm (0-100)
  const [footSize, setFootSize] = useState<string>(''); // foot_size (0-600)

  // Файлы
  const [passportPhotos, setPassportPhotos] = useState<File[]>([]);
  const [driverLicensePhotos, setDriverLicensePhotos] = useState<File[]>([]);

  const [passportPreviews, setPassportPreviews] = useState<string[]>([]);
  const [driverLicensePreviews, setDriverLicensePreviews] = useState<string[]>([]);

  // Create previews for passport photos
  useEffect(() => {
    const previews = passportPhotos.map(file => URL.createObjectURL(file));
    setPassportPreviews(previews);

    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [passportPhotos]);

  // Create previews for driver license photos
  useEffect(() => {
    const previews = driverLicensePhotos.map(file => URL.createObjectURL(file));
    setDriverLicensePreviews(previews);

    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [driverLicensePhotos]);

  const handlePassportUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (passportPhotos.length + files.length > MAX_FILES) {
      toastError(`${t('auth.maxFilesError')} ${MAX_FILES}`);
      return;
    }
    setPassportPhotos(prev => [...prev, ...files]);
    event.target.value = '';
  };

  const handleDriverLicenseUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (driverLicensePhotos.length + files.length > MAX_FILES) {
      toastError(`${t('auth.maxFilesError')} ${MAX_FILES}`);
      return;
    }
    setDriverLicensePhotos(prev => [...prev, ...files]);
    event.target.value = '';
  };

  const handleRemovePassportPhoto = (index: number) => {
    setPassportPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveDriverLicensePhoto = (index: number) => {
    setDriverLicensePhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Модалки
  const [pdfOpen, setPdfOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [showPhoneError, setShowPhoneError] = useState(false);
  const [showMeasurementErrors, setShowMeasurementErrors] = useState({
    height: false,
    chest: false,
    hips: false,
    inseam: false,
    topWaist: false,
    pantsWaist: false,
    headCircumference: false,
    footSize: false
  });

  const phoneErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const measurementErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Telegram data - автоматически получаем из Telegram WebApp
  useEffect(() => {
    // Check for override in localStorage (can be quickly disabled by removing the key)
    const overrideTelegramId = localStorage.getItem('override_telegram_id');
    if (overrideTelegramId && overrideTelegramId !== 'disabled') {
      const parsedId = parseInt(overrideTelegramId, 10);
      if (!isNaN(parsedId)) {
        setTelegramId(parsedId);
        console.log(`[DEBUG] Using overridden telegram_id: ${parsedId}`);
      }
    } else if (import.meta.env.VITE_DEBUG) {
      // Hardcoded values for development
      setTelegramId(1359929127);
      setUsername('tweeedlex');
    } else {
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser) {
        setTelegramId(telegramUser.id);
        setUsername(telegramUser.username || '');
      }
    }
  }, []);

  // sync language code with i18n language
  useEffect(() => {
    setLanguageCode(i18n.language);
  }, [i18n.language]);

  // Восстановление черновика регистрации
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.email) setEmail(d.email);
      if (d.password) setPassword(d.password);
      if (d.firstName) setFirstName(d.firstName);
      if (d.lastName) setLastName(d.lastName);
      if (d.birthDate) setBirthDate(d.birthDate);
      if (d.homeAddress) setHomeAddress(d.homeAddress);
      if (d.emergencyName) setEmergencyName(d.emergencyName);
      if (d.emergencyPhone) setEmergencyPhone(d.emergencyPhone);
      if (d.phoneNumber) setPhoneNumber(d.phoneNumber);
      if (d.heightCm) setHeightCm(String(d.heightCm));
      if (d.chestCm) setChestCm(String(d.chestCm));
      if (d.hipsCm) setHipsCm(String(d.hipsCm));
      if (d.inseamCm) setInseamCm(String(d.inseamCm));
      if (d.topWaistCm) setTopWaistCm(String(d.topWaistCm));
      else if (d.waistCm) setTopWaistCm(String(d.waistCm)); // Legacy support
      if (d.pantsWaistCm) setPantsWaistCm(String(d.pantsWaistCm));
      else if (d.waistCm && !d.topWaistCm) setPantsWaistCm(String(d.waistCm)); // Legacy support
      if (d.headCircumferenceCm) setHeadCircumferenceCm(String(d.headCircumferenceCm));
      if (d.footSize) setFootSize(String(d.footSize));
      else if (d.footSizeMm) setFootSize(String(d.footSizeMm)); // Legacy support
      // Банковские данные
      if (d.bankType) setBankType(d.bankType);
      if (d.bankAccountHolder) setBankAccountHolder(d.bankAccountHolder);
      if (d.bankName) setBankName(d.bankName);
      if (d.iban) setIban(d.iban);
      if (d.bic) setBic(d.bic);
      if (d.accountNumber) setAccountNumber(d.accountNumber);
      if (d.routingNumber) setRoutingNumber(d.routingNumber);
      if (d.sortCode) setSortCode(d.sortCode);
      if (d.transitNumber) setTransitNumber(d.transitNumber);
      if (d.bsbNumber) setBsbNumber(d.bsbNumber);
      if (d.bankCode) setBankCode(d.bankCode);
      if (d.branchCode) setBranchCode(d.branchCode);
      if (d.cnapsCode) setCnapsCode(d.cnapsCode);
      if (d.cardNumber) setCardNumber(d.cardNumber);
    } catch {
    }
  }, []);

  // Сохранение черновика при изменениях
  useEffect(() => {
    const draft = {
      email, password, firstName, lastName, birthDate, homeAddress,
      emergencyName, emergencyPhone, phoneNumber,
      heightCm, chestCm, hipsCm, inseamCm, topWaistCm, pantsWaistCm, headCircumferenceCm, footSize,
      bankType, bankAccountHolder, bankName, iban, bic, accountNumber, routingNumber,
      sortCode, transitNumber, bsbNumber, bankCode, branchCode, cnapsCode, cardNumber
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    email, password, firstName, lastName, birthDate, homeAddress,
    emergencyName, emergencyPhone, phoneNumber,
    heightCm, chestCm, hipsCm, inseamCm, topWaistCm, pantsWaistCm, headCircumferenceCm, footSize,
    bankType, bankAccountHolder, bankName, iban, bic, accountNumber, routingNumber,
    sortCode, transitNumber, bsbNumber, bankCode, branchCode, cnapsCode, cardNumber
  ]);

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^\+?\d{10,15}$/;
    return phoneRegex.test(cleanPhone);
  };

  const validateMeasurement = (value: string, min: number = 0, max: number = 1000): boolean => {
    if (!value) return true;
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  };

  useEffect(() => {
    if (phoneErrorTimeoutRef.current) {
      clearTimeout(phoneErrorTimeoutRef.current);
    }
    phoneErrorTimeoutRef.current = setTimeout(() => {
      if (emergencyPhone && !validatePhone(emergencyPhone)) {
        setShowPhoneError(true);
      } else {
        setShowPhoneError(false);
      }
    }, 1000);

    return () => {
      if (phoneErrorTimeoutRef.current) {
        clearTimeout(phoneErrorTimeoutRef.current);
      }
    };
  }, [emergencyPhone]);

  useEffect(() => {
    if (measurementErrorTimeoutRef.current) {
      clearTimeout(measurementErrorTimeoutRef.current);
    }
    measurementErrorTimeoutRef.current = setTimeout(() => {
      setShowMeasurementErrors({
        height: !!(heightCm && !validateMeasurement(heightCm, 0, 300)),
        chest: !!(chestCm && !validateMeasurement(chestCm, 0, 300)),
        hips: !!(hipsCm && !validateMeasurement(hipsCm, 0, 300)),
        inseam: !!(inseamCm && !validateMeasurement(inseamCm, 0, 150)),
        topWaist: !!(topWaistCm && !validateMeasurement(topWaistCm, 0, 300)),
        pantsWaist: !!(pantsWaistCm && !validateMeasurement(pantsWaistCm, 0, 300)),
        headCircumference: !!(headCircumferenceCm && !validateMeasurement(headCircumferenceCm, 0, 100)),
        footSize: !!(footSize && !validateMeasurement(footSize, 0, 600))
      });
    }, 1000);

    return () => {
      if (measurementErrorTimeoutRef.current) {
        clearTimeout(measurementErrorTimeoutRef.current);
      }
    };
  }, [heightCm, chestCm, hipsCm, inseamCm, topWaistCm, pantsWaistCm, headCircumferenceCm, footSize]);

  const registerRequest = async () => {
    const fd = new FormData();
    
    // Обязательные поля
    fd.append('email', email);
    fd.append('password', password);
    fd.append('first_name', firstName);
    fd.append('last_name', lastName);

    // Опциональные поля - telegram_id автоматически получается из Telegram WebApp
    if (telegramId) {
      fd.append('telegram_id', String(telegramId));
    }
    if (username && username.trim()) fd.append('username', username.trim());
    const langCode = (i18n.language || 'en').substring(0, 10);
    if (langCode) fd.append('lang_code', langCode);
    fd.append('worker_type', 'worker');

    // Контактные данные
    if (phoneNumber && phoneNumber.trim()) fd.append('phone_number', phoneNumber.trim());
    if (emergencyPhone && emergencyPhone.trim()) fd.append('emergency_relative_phone', emergencyPhone.trim());
    if (emergencyName && emergencyName.trim()) fd.append('emergency_relative_name', emergencyName.trim());
    if (homeAddress && homeAddress.trim()) fd.append('home_address', homeAddress.trim());

    // Банковские данные (JSON string) - собираем из полей формы
    const bankDetailsObj: Record<string, string> = {};
    if (bankType) {
      bankDetailsObj.type = bankType;
      if (bankAccountHolder) bankDetailsObj.account_holder = bankAccountHolder;
      if (bankName) bankDetailsObj.bank_name = bankName;
      
      if (bankType === 'iban') {
        if (iban) bankDetailsObj.iban = iban.replace(/\s/g, '').toUpperCase();
        if (bic) bankDetailsObj.bic = bic.toUpperCase();
      } else if (bankType === 'sepa') {
        if (iban) bankDetailsObj.iban = iban.replace(/\s/g, '').toUpperCase();
        if (bic) bankDetailsObj.bic = bic.toUpperCase();
        bankDetailsObj.sepa_currency = 'EUR';
      } else if (bankType === 'swift' || bankType === 'swift_transfer') {
        if (bic) bankDetailsObj.bic = bic.toUpperCase();
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
        if (iban) bankDetailsObj.iban = iban.replace(/\s/g, '').toUpperCase();
      } else if (bankType === 'ach') {
        if (routingNumber) bankDetailsObj.routing_number = routingNumber;
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
      } else if (bankType === 'wire_us') {
        if (routingNumber) bankDetailsObj.routing_number = routingNumber;
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
        if (bic) bankDetailsObj.bic = bic.toUpperCase();
      } else if (bankType === 'sort_code') {
        if (sortCode) bankDetailsObj.sort_code = sortCode.replace(/-/g, '');
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
        if (iban) bankDetailsObj.iban = iban.replace(/\s/g, '').toUpperCase();
      } else if (bankType === 'transit_ca') {
        if (transitNumber) bankDetailsObj.transit_number = transitNumber.replace(/-/g, '');
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
      } else if (bankType === 'bsb') {
        if (bsbNumber) bankDetailsObj.bsb = bsbNumber;
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
      } else if (bankType === 'zengin') {
        if (bankCode) bankDetailsObj.bank_code = bankCode;
        if (branchCode) bankDetailsObj.branch_code = branchCode;
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
      } else if (bankType === 'cnaps') {
        if (cnapsCode) bankDetailsObj.cnaps = cnapsCode;
        if (accountNumber) bankDetailsObj.account_number = accountNumber;
      } else if (bankType === 'pan') {
        if (cardNumber) bankDetailsObj.card_number = cardNumber.replace(/\s/g, '');
      }
      
      // Добавляем только если есть хотя бы какие-то данные
      if (Object.keys(bankDetailsObj).length > 1) {
        fd.append('bank_details', JSON.stringify(bankDetailsObj));
      }
    }

    // Дата рождения
    if (birthDate) fd.append('birth_date', birthDate);

    // Измерения - конвертируем в числа с валидацией диапазонов
    // FastAPI ожидает числа, но FormData отправляет строки, поэтому отправляем как строки
    if (heightCm && heightCm.trim()) {
      const num = parseInt(heightCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 300) fd.append('height_cm', String(num));
    }
    if (hipsCm && hipsCm.trim()) {
      const num = parseInt(hipsCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 300) fd.append('hips_cm', String(num));
    }
    if (inseamCm && inseamCm.trim()) {
      const num = parseInt(inseamCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 150) fd.append('inseam_cm', String(num));
    }
    if (chestCm && chestCm.trim()) {
      const num = parseInt(chestCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 300) fd.append('chest_cm', String(num));
    }
    if (pantsWaistCm && pantsWaistCm.trim()) {
      const num = parseInt(pantsWaistCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 300) fd.append('pants_waist_cm', String(num));
    }
    if (topWaistCm && topWaistCm.trim()) {
      const num = parseInt(topWaistCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 300) fd.append('top_waist_cm', String(num));
    }
    if (headCircumferenceCm && headCircumferenceCm.trim()) {
      const num = parseInt(headCircumferenceCm.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 100) fd.append('head_circumference_cm', String(num));
    }
    if (footSize && footSize.trim()) {
      const num = parseInt(footSize.trim(), 10);
      if (!isNaN(num) && num >= 0 && num <= 600) fd.append('foot_size', String(num));
    }

    // Множественные фото паспорта
    passportPhotos.forEach((photo) => {
      fd.append('passport_photos', photo);
    });

    // Множественные фото водительского удостоверения
    driverLicensePhotos.forEach((photo) => {
      fd.append('driver_license_photos', photo);
    });

    // Registration endpoint uses /api/v1 prefix
    const apiUrl = getApiUrl('registration/register', true);
    try {
      const resp = await axios.post(apiUrl, fd, {
        headers: { Accept: 'application/json' },
      });
      return resp.data;
    } catch (error: any) {
      // Handle CORS error - if status is 201, treat as success
      // This is a workaround for CORS issue on backend
      if (error.code === 'ERR_NETWORK' && error.response?.status === 201) {
        // Request was successful but CORS blocked the response
        // Try to parse response data if available
        if (error.response?.data) {
          return error.response.data;
        }
        // If no data, return a success indicator
        // The actual registration happened on server
        return { success: true, message: 'Registration successful' };
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password before submission
    if (password.length < 8) {
      toastError(t('auth.passwordMinLength', 'Password must be at least 8 characters'));
      setStep(1);
      setIsLoading(false);
      return;
    }
    if (password.length > 128) {
      toastError(t('auth.passwordMaxLength', 'Password must be at most 128 characters'));
      setStep(1);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    try {
      const registerResponse = await registerRequest();
      // Новый эндпоинт возвращает access_token и refresh_token
      if (registerResponse?.access_token) {
        localStorage.setItem('authToken', registerResponse.access_token);
        localStorage.setItem('username', email);
        // Сохраняем refresh_token для автоматической регенерации токена
        if (registerResponse?.refresh_token) {
          localStorage.setItem('refreshToken', registerResponse.refresh_token);
        }
        
        // Create worker record in bot-api after successful registration
        try {
          const workerData: Record<string, any> = {
            first_name: firstName,
            last_name: lastName,
            worker_type: 'worker',
            rate: 0,
            email: email,
            crm_id: registerResponse.user_id || '',
          };

          // Add optional fields only if they exist
          if (telegramId) {
            workerData.telegram_id = telegramId;
          }
          if (username && username.trim()) {
            workerData.username = username.trim();
          }
          const langCode = (i18n.language || 'en').substring(0, 10);
          if (langCode) {
            workerData.language_code = langCode;
          }
          if (birthDate) {
            // Convert YYYY-MM-DD to ISO string
            const date = new Date(birthDate + 'T00:00:00.000Z');
            workerData.birthday = date.toISOString();
          }

          const workerResponse = await axios.post(`${BOT_API_URL}/api/v1/worker/`, workerData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': BOT_API_TOKEN,
            },
          });
          
          // Save bot-api worker id for future requests
          if (workerResponse.data?.id) {
            localStorage.setItem('botApiWorkerId', String(workerResponse.data.id));
          }
        } catch (workerErr: any) {
          // Log error but don't fail registration if worker creation fails
          console.warn('Failed to create worker record in bot-api:', workerErr);
          // Continue with registration success
        }
        
        if (registerResponse?.user_id) {
          // Можно получить данные пользователя если нужно
          dispatch(setUser({ id: registerResponse.user_id, email: registerResponse.email } as any));
        }
        sessionStorage.removeItem(DRAFT_KEY);
        toastSuccess(t('auth.registerSuccess') || 'Регистрация успешна');
        navigate('/');
      } else {
        const msg = registerResponse?.detail || registerResponse?.message || t('auth.registerError');
        toastError(`${t('auth.registerError')}: ${msg}`);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle validation errors (422)
      if (err?.response?.status === 422) {
        const errorData = err?.response?.data;
        let errorMessage = '';
        
        if (errorData?.detail) {
          // FastAPI validation errors format
          if (Array.isArray(errorData.detail)) {
            const errors = errorData.detail.map((e: any) => {
              const field = e.loc?.join('.') || e.field || '';
              return `${field}: ${e.msg || e.message || 'Invalid value'}`;
            });
            errorMessage = errors.join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else {
          errorMessage = errorData?.message || err?.message || t('auth.registerError');
        }
        
        toastError(`${t('auth.registerError')}: ${errorMessage}`);
      } else {
        const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || t('auth.registerError');
        toastError(`${t('auth.registerError')}: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  
  // Validate password
  useEffect(() => {
    if (password && password.length < 8) {
      setPasswordError(t('auth.passwordMinLength', 'Password must be at least 8 characters'));
    } else if (password && password.length > 128) {
      setPasswordError(t('auth.passwordMaxLength', 'Password must be at most 128 characters'));
    } else {
      setPasswordError('');
    }
  }, [password, t]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return Boolean(email && password && password.length >= 8 && password.length <= 128);
    }
    if (step === 2) {
      const phoneValid = !emergencyPhone || validatePhone(emergencyPhone);
      return Boolean(firstName && lastName && birthDate && phoneValid);
    }
    if (step === 3) {
      const measurementsValid = 
        (!heightCm || validateMeasurement(heightCm, 0, 300)) &&
        (!chestCm || validateMeasurement(chestCm, 0, 300)) &&
        (!hipsCm || validateMeasurement(hipsCm, 0, 300)) &&
        (!inseamCm || validateMeasurement(inseamCm, 0, 150)) &&
        (!topWaistCm || validateMeasurement(topWaistCm, 0, 300)) &&
        (!pantsWaistCm || validateMeasurement(pantsWaistCm, 0, 300)) &&
        (!headCircumferenceCm || validateMeasurement(headCircumferenceCm, 0, 100)) &&
        (!footSize || validateMeasurement(footSize, 0, 600));
      return measurementsValid;
    }
    return false;
  }, [step, email, password, firstName, lastName, birthDate, emergencyPhone, 
      heightCm, chestCm, hipsCm, inseamCm, topWaistCm, pantsWaistCm, headCircumferenceCm, footSize]);

  const progressPct = useMemo(() => (step / 4) * 100, [step]);

  return (
    <div className="page login-container">
      <LanguageSwitcher/>
      <div className="login-card">
        <div className="login-header">
          <h2>
            {t('auth.create')} <span className={"text-3xl"}>SKYBUD</span>
          </h2>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        <div className="stepper">
          <div className="stepper-track">
            <div className="stepper-progress" style={{width: `${progressPct}%`}}/>
          </div>
          <div className="stepper-dots">
            {[1, 2, 3, 4].map((i) => (
              <button
                key={i}
                className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                onClick={() => setStep(i as Step)}
                aria-label={`Перейти к шагу ${i}`}
                type="button"
              >
                {i}
              </button>
            ))}
          </div>
          <div className="stepper-label">
            {step === 1 && t('auth.step1')}
            {step === 2 && t('auth.step2')}
            {step === 3 && t('auth.step3')}
            {step === 4 && t('auth.step4')}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* === REGISTER WIZARD === */}
          {step === 1 && (
            <>
              <div className="input-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="input-highlight"></span>
              </div>

              <div className="input-group">
                <label>{t('auth.password')}</label>
                <div className="password-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholderRegister')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                    title={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPass ? t('auth.hide') : t('auth.show')}
                  </button>
                  <span className="input-highlight"></span>
                </div>
                <div className={`helper-text ${passwordError ? 'error' : ''}`}>
                  {passwordError || t('auth.passwordHelper', 'Minimum 8 characters, recommend letters and numbers.')}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.firstName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.firstName')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.lastName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.lastName')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.birthDate')}</label>
                  <input
                    type="date"
                    placeholder={t('auth.birthDatePlaceholder')}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.phoneNumber', 'Phone Number')}</label>
                  <input
                    type="tel"
                    placeholder="+380787438473"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={32}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.homeAddress')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.addressPlaceholder')}
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.emergencyContactName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.emergencyContactNamePlaceholder')}
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    maxLength={160}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.emergencyContactPhone')}</label>
                  <input
                    type="tel"
                    placeholder="+380787438473"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    maxLength={32}
                  />
                  {showPhoneError && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
              </div>

              <div className="divider"></div>

              <div className="input-group">
                <label>{t('auth.bankDetails', 'Bank Details')} ({t('auth.optional', 'Optional')})</label>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.9 }}>
                    {t('auth.bankType', 'Payment System Type')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['iban', 'sepa', 'swift', 'ach', 'wire_us', 'sort_code', 'transit_ca', 'bsb', 'zengin', 'cnaps', 'pan'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBankType(type as BankType)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: `2px solid ${bankType === type ? '#4a9eff' : 'rgba(255,255,255,0.2)'}`,
                          background: bankType === type ? 'rgba(74, 158, 255, 0.2)' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                    {bankType && (
                      <button
                        type="button"
                        onClick={() => {
                          setBankType('');
                          setBankAccountHolder('');
                          setBankName('');
                          setIban('');
                          setBic('');
                          setAccountNumber('');
                          setRoutingNumber('');
                          setSortCode('');
                          setTransitNumber('');
                          setBsbNumber('');
                          setBankCode('');
                          setBranchCode('');
                          setCnapsCode('');
                          setCardNumber('');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '2px solid rgba(255, 93, 93, 0.5)',
                          background: 'transparent',
                          color: '#ff5d5d',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {t('auth.clear', 'Clear')}
                      </button>
                    )}
                  </div>
                </div>

                {bankType && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div className="grid-2">
                      <div className="input-group">
                        <label>{t('auth.bankAccountHolder', 'Account Holder')}</label>
                        <input
                          type="text"
                          placeholder={t('auth.bankAccountHolderPlaceholder', 'Account Holder Name')}
                          value={bankAccountHolder}
                          onChange={(e) => setBankAccountHolder(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>{t('auth.bankName', 'Bank Name')}</label>
                        <input
                          type="text"
                          placeholder={t('auth.bankNamePlaceholder', 'Bank Name')}
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                    </div>

                    {(bankType === 'iban' || bankType === 'sepa') && (
                      <div className="grid-2">
                        <div className="input-group">
                          <label>IBAN *</label>
                          <input
                            type="text"
                            placeholder="DE89 3704 0044 0532 0130 00"
                            value={iban}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '').toUpperCase();
                              const formatted = value.replace(/(.{4})/g, '$1 ').trim();
                              setIban(formatted);
                            }}
                            maxLength={42}
                          />
                        </div>
                        <div className="input-group">
                          <label>BIC/SWIFT {bankType === 'sepa' ? '*' : ''}</label>
                          <input
                            type="text"
                            placeholder="COBADEFFXXX"
                            value={bic}
                            onChange={(e) => setBic(e.target.value.toUpperCase())}
                            maxLength={11}
                          />
                        </div>
                      </div>
                    )}

                    {(bankType === 'swift' || bankType === 'swift_transfer') && (
                      <div className="grid-2">
                        <div className="input-group">
                          <label>BIC/SWIFT *</label>
                          <input
                            type="text"
                            placeholder="DEUTDEFF"
                            value={bic}
                            onChange={(e) => setBic(e.target.value.toUpperCase())}
                            maxLength={11}
                          />
                        </div>
                        <div className="input-group">
                          <label>{t('auth.accountNumber', 'Account Number')} *</label>
                          <input
                            type="text"
                            placeholder={t('auth.accountNumberPlaceholder', 'Account Number')}
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {(bankType === 'ach' || bankType === 'wire_us') && (
                      <div className="grid-2">
                        <div className="input-group">
                          <label>{t('auth.routingNumber', 'Routing Number')} *</label>
                          <input
                            type="text"
                            placeholder="123456789"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                            maxLength={9}
                          />
                        </div>
                        <div className="input-group">
                          <label>{t('auth.accountNumber', 'Account Number')} *</label>
                          <input
                            type="text"
                            placeholder={t('auth.accountNumberPlaceholder', 'Account Number')}
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {bankType === 'sort_code' && (
                      <div className="grid-2">
                        <div className="input-group">
                          <label>Sort Code *</label>
                          <input
                            type="text"
                            placeholder="12-34-56"
                            value={sortCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/-/g, '').replace(/\D/g, '');
                              const formatted = value.length > 0 
                                ? value.match(/.{1,2}/g)?.join('-') || value
                                : '';
                              setSortCode(formatted);
                            }}
                            maxLength={8}
                          />
                        </div>
                        <div className="input-group">
                          <label>{t('auth.accountNumber', 'Account Number')} *</label>
                          <input
                            type="text"
                            placeholder={t('auth.accountNumberPlaceholder', 'Account Number')}
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {bankType === 'pan' && (
                      <div className="input-group">
                        <label>{t('auth.cardNumber', 'Card Number')} *</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                            const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                            setCardNumber(formatted);
                          }}
                          maxLength={19}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>

              <div className="grid-3">
                <div className="input-group">
                  <label>{t('auth.height')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="300"
                    placeholder={t('auth.heightPlaceholder')}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                  {showMeasurementErrors.height && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>{t('auth.chest')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="300"
                    placeholder={t('auth.chestPlaceholder')}
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                  />
                  {showMeasurementErrors.chest && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>{t('auth.hips')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="300"
                    placeholder={t('auth.hipsPlaceholder')}
                    value={hipsCm}
                    onChange={(e) => setHipsCm(e.target.value)}
                  />
                  {showMeasurementErrors.hips && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label>{t('auth.inseam')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="150"
                    placeholder={t('auth.inseamPlaceholder')}
                    value={inseamCm}
                    onChange={(e) => setInseamCm(e.target.value)}
                  />
                  {showMeasurementErrors.inseam && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>{t('auth.topWaist', 'Top Waist')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="300"
                    placeholder={t('auth.topWaistPlaceholder', 'Top Waist (cm)')}
                    value={topWaistCm}
                    onChange={(e) => setTopWaistCm(e.target.value)}
                  />
                  {showMeasurementErrors.topWaist && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>{t('auth.pantsWaist', 'Pants Waist')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="300"
                    placeholder={t('auth.pantsWaistPlaceholder', 'Pants Waist (cm)')}
                    value={pantsWaistCm}
                    onChange={(e) => setPantsWaistCm(e.target.value)}
                  />
                  {showMeasurementErrors.pantsWaist && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label>{t('auth.headCircumference')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder={t('auth.headCircumferencePlaceholder')}
                    value={headCircumferenceCm}
                    onChange={(e) => setHeadCircumferenceCm(e.target.value)}
                  />
                  {showMeasurementErrors.headCircumference && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>{t('auth.footSize', 'Foot Size')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="600"
                    placeholder={t('auth.footSizePlaceholder', 'Foot Size')}
                    value={footSize}
                    onChange={(e) => setFootSize(e.target.value)}
                  />
                  {showMeasurementErrors.footSize && (
                    <div className="helper-text" style={{ color: 'rgba(255,93,93,.8)' }}>
                      {t('auth.measurementInvalid', 'Value is incorrect')}
                    </div>
                  )}
                </div>
              </div>

              <div className="helper-text">
                {t('auth.measurementHelper')}{' '}
                <button
                  type="button"
                  className="linklike"
                  onClick={() => setPdfOpen(true)}
                >
                  {t('auth.measurementGuideLink')}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="input-group">
                <label style={{ 
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#fff'
                }}>
                  📄 {t('auth.passportFile', 'Passport Photos')}
                  <span style={{ fontSize: '12px', fontWeight: '400', opacity: 0.7, marginLeft: '8px' }}>
                    ({t('auth.required', 'Required')})
                  </span>
                </label>
                <label className="file-label" data-browse-text={t('auth.browse', 'Browse')} style={{ 
                  display: 'block',
                  padding: '16px',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4a9eff';
                  e.currentTarget.style.background = 'rgba(74, 158, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                >
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    {t('auth.clickToSelectPassport', 'Click to select passport photos')}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePassportUpload}
                    style={{ display: 'none' }}
                    disabled={passportPhotos.length >= MAX_FILES}
                  />
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    JPEG, PNG ({t('auth.multipleFiles', 'multiple files allowed')})
                  </div>
                </label>
                {passportPhotos.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255,255,255,0.8)', 
                      marginBottom: '12px'
                    }}>
                      {t('auth.uploadedPhotos', 'Uploaded photos')}: {passportPhotos.length}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                      {passportPhotos.map((photo, index) => (
                        <div key={index} style={{
                          position: 'relative',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.05)'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleRemovePassportPhoto(index)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: 'none',
                              background: 'rgba(255, 93, 93, 0.9)',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10
                            }}
                            title={t('auth.removePhoto', 'Remove photo')}
                          >
                            ×
                          </button>
                          <img
                            src={passportPreviews[index]}
                            alt={`Passport ${index + 1}`}
                            onClick={() => setPreviewImage({ url: passportPreviews[index], name: photo.name })}
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            title={t('auth.clickToPreview', 'Click to preview')}
                          />
                          <div style={{ padding: '4px', fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {photo.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="divider" style={{ margin: '24px 0' }}></div>

              <div className="input-group">
                <label style={{ 
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#fff'
                }}>
                  🚗 {t('auth.driverLicenseFile', 'Driver License Photos')}
                  <span style={{ fontSize: '12px', fontWeight: '400', opacity: 0.7, marginLeft: '8px' }}>
                    ({t('auth.optional', 'Optional')})
                  </span>
                </label>
                <label className="file-label" data-browse-text={t('auth.browse', 'Browse')} style={{ 
                  display: 'block',
                  padding: '16px',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4a9eff';
                  e.currentTarget.style.background = 'rgba(74, 158, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                >
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    {t('auth.clickToSelectDriverLicense', 'Click to select driver license photos')}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleDriverLicenseUpload}
                    style={{ display: 'none' }}
                    disabled={driverLicensePhotos.length >= MAX_FILES}
                  />
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    JPEG, PNG ({t('auth.multipleFiles', 'multiple files allowed')})
                  </div>
                </label>
                {driverLicensePhotos.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255,255,255,0.8)', 
                      marginBottom: '12px'
                    }}>
                      {t('auth.uploadedPhotos', 'Uploaded photos')}: {driverLicensePhotos.length}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                      {driverLicensePhotos.map((photo, index) => (
                        <div key={index} style={{
                          position: 'relative',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.05)'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveDriverLicensePhoto(index)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: 'none',
                              background: 'rgba(255, 93, 93, 0.9)',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10
                            }}
                            title={t('auth.removePhoto', 'Remove photo')}
                          >
                            ×
                          </button>
                          <img
                            src={driverLicensePreviews[index]}
                            alt={`Driver License ${index + 1}`}
                            onClick={() => setPreviewImage({ url: driverLicensePreviews[index], name: photo.name })}
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            title={t('auth.clickToPreview', 'Click to preview')}
                          />
                          <div style={{ padding: '4px', fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {photo.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="success-message" role="status" style={{ marginTop: '24px' }}>
                {t('auth.almostDone', 'Almost done! Click "Complete Registration" to submit.')}
              </div>
            </>
          )}

          {/* Навигация по шагам */}
          <div className="wizard-nav">
            {step > 1 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(((step - 1) as Step))}
              >
                {t('auth.back')}
              </button>
            )}
            {step === 1 && (
              <Link to="/login" className="btn-secondary">
                {t('auth.loginLink')}
              </Link>
            )}
            {step < 4 && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => canNext && setStep(((step + 1) as Step))}
                disabled={!canNext}
              >
                {t('auth.next')}
              </button>
            )}
          </div>


          {
            step === 4 &&
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading
                ? <div className="spinner"></div>
                : t('auth.completeRegistration')}
            </button>
          }
        </form>

        {/*<div className="login-footer">*/}
        {/*  <p>{t('auth.registerHelpText')}</p>*/}
        {/*</div>*/}

        <div className="login-decoration">
          <div className="decoration-orb orange"></div>
          <div className="decoration-orb gray"></div>
        </div>
      </div>

      {pdfOpen && (
        <div className="modal-backdrop" onClick={() => setPdfOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('auth.measurementGuideTitle')}</h3>
              <button className="modal-close" onClick={() => setPdfOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <iframe
                title={t('auth.measurementGuide')}
                src={guidePdf}
                className="pdf-frame"
              />
            </div>
            <div className="modal-foot">
              <a href={guidePdf} target="_blank" rel="noopener noreferrer"
                 className="btn-primary">{t('auth.openPdf')}</a>
              <a href={guidePdf} download className="btn-secondary">{t('auth.downloadPdf')}</a>
              <button className="btn-secondary" onClick={() => setPdfOpen(false)}>{t('auth.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка просмотра изображения */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            background: 'rgba(30, 30, 30, 0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                zIndex: 10001
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 93, 93, 0.8)';
                e.currentTarget.style.borderColor = '#ff5d5d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              ×
            </button>
            <div style={{ marginBottom: '12px', color: '#fff', fontSize: '14px', textAlign: 'center', opacity: 0.9 }}>
              {previewImage.name}
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
