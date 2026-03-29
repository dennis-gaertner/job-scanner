// Log
//
// 16.3.2026
// -new_flag jetzt Formelspalte
// -sortJobsAllForCockpit_() gehärtet
// -applyCockpitFieldsToRow_() schreibt kein new_flag

//
// 28.3.2026
// - new functions for scoring diagnostics. see section "SCORING DIAGNOSTICS"


// *****************************************
// 1. KONFIGURATION & KONSTANTEN
// *****************************************

const CONFIG = {
  sheets: {
    jobsAll: 'Jobs_All',
    jobsUser: 'Jobs_User',
    jobsCockpit: 'Jobs_Cockpit',
    notifiedAll: 'Notified_All',
    scanLog: 'Scan_Log',
  },
  gmailLabels: {
    bund: 'Jobs/BundCH',
    oebb: 'Jobs/OEBB',
    sbb: 'Jobs/SBB',
    lh: 'Jobs/LH',
    zrh: 'Jobs/ZRH',
    airbus: 'Jobs/Airbus',
    kn: 'Jobs/KN',
    eu: 'Crawler/EU',
    skyguide: 'Crawler/Skyguide',
    eurocontrol: 'Crawler/Eurocontrol',
    jobroom: 'Crawler/JobRoom',
    db: 'Crawler/DB',
  },
  debugMail: {
    includeIgnoredJobs: true,
    maxIgnoredPerSource: 15
  },
  scoring: {
    bundde: {
      positiveKeywords: {
        'ökonom': 8,
        'oekonom': 8,
        'analyse': 5,
        'analyst': 6,
        'strategie': 6,
        'steuerung': 5,
        'grundsatz': 6,
        'daten': 2,
        'data': 2,
        'modell': 4,
        'wissenschaftlich': 2,
        'wissenschaftliche': 2,
        'forschung': 3,
        'digitalpolitik': 4,
        'verwaltungsdigitalisierung': 5,
        'finanzen': 2,
        'haushalt': 2,
        'referent': 0,
        'referentin': 0
      },
      negativeKeywords: {
        'pflege': -8,
        'assistenz': -6,
        'sekretariat': -6,
        'sozialpädagog': -8,
        'pädagog': -6,
        'kindertagesbetreuung': -7,
        'jugendschutz': -6,
        'museumspädagogik': -7,
        'studium': -5,
        'lehre': -4,
        'pharmazie': -5,
        'bautechnik': -5,
        'denkmal': -4,
        'kultur': -3,
        'personalrecht': -5,
        'personalorganisation': -5,
        'rechtsstelle': -4,
        'jurist': -4,
        'juristin': -4
      },
      bonusPatterns: {
        'ökonom': 4,
        'oekonom': 4,
        'analyse': 2,
        'analyst': 2,
        'strategie': 3,
        'steuerung': 3,
        'grundsatz': 3,
        'daten': 2,
        'data': 2,
        'modell': 2,
        'wissenschaftlich': 2,
        'wissenschaftliche': 2,
        'finanzen': 2,
        'haushalt': 2,
        'referent': 0,
        'referentin': 0
      },
      hardReject: [
        'sekretariat',
        'tierpfleger',
        'chemielaborant',
        'sozialpädagog'
      ],
      thresholds: {
        relevant: 9,
        maybe: 4
      }
    },

    bund: {
      positiveKeywords: {
        'ökonom': 6,
        'oekonom': 6,
        'wirtschaft': 4,
        'economist': 5,
        'economic': 4,
        'steuerpolitik': 6,
        'policy': 4,
        'strategie': 4,
        'strategy': 4,
        'analyse': 4,
        'analyst': 4,
        'wissenschaft': 3,
        'wissenschaftlich': 3,
        'regulierung': 5,
        'regulatory': 5,
        'wettbewerb': 5,
        'competition': 5,
        'daten': 3,
        'data': 3,
        'statistik': 3,
        'markt': 3,
        'tarif': 5,
        'pricing': 5,
        'verkehr': 4,
        'mobilität': 5,
        'transport': 4,
        'international': 2,
        'infrastruktur': 5,
        'bahn': 4,
        'steuer': 4,
        'forschung': 3,
        'research': 3,
        'businessanalyse': 3,
        'prozessmanagement': 2,
        'projektleitung': 2,
        'projekt': 1,
        'gremium': 2,
        'englisch': 1,
        'mathematik': 4,
        'mathematisch': 3,
        'quantitativ': 3,
        'versicherungsmathematik': 4,
        'aktuariell': 3,
        'modell': 3,
        'prognose': 3,
        'leitung': 2,
        'sozialversicherung': 3,
        'sozialversicherungen': 3,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'gallen': -10,        
        'assistenz': -5,
        'assistent': -5,
        'empfang': -7,
        'sekretariat': -6,
        'sachbearbeiter': -7,
        'administration': -4,
        'fachkraft empfang': -8,
        'hausdienst': -10,
        'logistik': -4,
        'mechatroniker': -10,
        'pflege': -8,
        'arztsekretariat': -8,
        'reinigung': -10,
        'fahrer': -10,
        'lager': -8,
        'verkauf': -6,
        'vertrieb': -5,
        'kundenberatung': -5,
        'security': -6,
        'polizei': -4,
        'militär': -3,
        'jurist': -8,
        'juristin': -8,
        'rechtsdienst': -8,
        'recht': -4,
        'informatik': -3,
        'system-spezialist': -3,
        'netzinfrastruktur': -2,
        'kanzlei': -4,

        'gewässerqualität': -6,
        'nichtionisierende strahlen': -6,
        'biozide': -6,
        'invasive pflanzen': -6,
        'japankäfer': -6,
        'fachbereich boden': -5,
        'veterinär': -5,
        'lebensmittelsicherheit': -5,
        'datenvisualisierung': -3,
        'webpublishing': -4,
        'cyber threat': -6,
        'data plattform engineer': -6,
        'sap': -4,
        'it architekt': -3,
        'prozessmanager': -2,
        'organisations': -2,
        'finanzen': -1  // falls nicht analytisch
      },
      bonusPatterns: {
        'bundesamt für zivilluftfahrt': 5,
        'bundesamt für verkehr': 4,
        'bundesamt für statistik': 3,
        'bundesamt für energie': 4,
        'staatssekretariat für wirtschaft': 3,
        'steuerverwaltung': 3,
        'wettbewerbskommission': 4,
        'mobilität': 3,
        'internationales': 2,
        'sozialversicherung': 1,
        'sozialversicherungen': 1
      },
      hardReject: [
        'empfang',
        'fachkraft empfang',
        'hausdienst',
        'mechatroniker',
        'reinigung',
        'lager',
        'wäscherei'
      ],
      thresholds: {
        relevant: 10,
        maybe: 4
      }
    },

    oebb: {
      positiveKeywords: {
        'pricing': 8,
        'preis': 6,
        'tarif': 6,
        'strategie': 4,
        'strategisch': 4,
        'strategy': 4,
        'strategic': 4,
        'wirtschaft': 3,
        'analyse': 4,
        'analyst': 4,
        'mobilität': 4,
        'verkehr': 4,
        'international': 2,
        'policy': 3,
        'regulierung': 4,
        'competition': 4,
        'manager': 2,
        'senior': 1,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'einkauf': -3,
        'chef': -5,
        'sous chef': -10,
        'küche': -10,
        'mechatronik': -8,
        'fahrdienst': -5,
        'technik': -3,
        'elektrik': -6,
        'schlosser': -8,
        'reinigung': -10
      },
      bonusPatterns: {
        'pricing manager': 4,
        'senior pricing': 4,
        'senior pricing manager': 6
      },
      hardReject: [
        'sous chef',
        'küche',
        'reinigung'
      ],
      thresholds: {
        relevant: 8,
        maybe: 3
      }
    },

    sbb: {
      positiveKeywords: {
        'preis': 5,
        'pricing': 6,
        'tarif': 5,
        'strategie': 4,
        'strategisch': 4,
        'analyse': 4,
        'analyst': 4,
        'wirtschaft': 3,
        'mobilität': 4,
        'verkehr': 1,
        'transport': 0,
        'international': 2,
        'regulierung': 4,
        'competition': 4,
        'projekt': 1,
        'prozess': 2,
        'daten': 3,
        'data': 3,
        'infrastruktur': 1,
        'kundeninformation': 1,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'chefmonteur': -8,
        'techniker': -4,
        'polymechaniker': -8,
        'schlosser': -8,
        'anlagen': -3,
        'produktion': -3,
        'reinigung': -10,
        'fahrer': -6,
        'lokführer': -8,
        'kundenbegleiter': -5,
        'verkauf': -5,
        'rangier': -8,
        'rangierspezialist': -10,
        'logistiker': -8,
        'logistik': -5,
        'transportpolizei': -10,
        'polizist': -10,
        'ausbildung': -8,
        'quereinstieg': -6,
        'güterverkehr': -6
      },
      bonusPatterns: {},
      hardReject: [
        'chefmonteur',
        'polymechaniker',
        'schlosser',
        'reinigung',
        'rangierspezialist',
        'transportpolizei',
        'polizist',
        'ausbildung',
        'quereinstieg'
      ],
      thresholds: {
        relevant: 8,
        maybe: 3
      }
    },

    kn: {
      positiveKeywords: {
        'ökonom': 6,
        'oekonom': 6,
        'wirtschaft': 4,
        'economist': 5,
        'economic': 4,
        'policy': 4,
        'strategie': 4,
        'strategy': 4,
        'analyse': 4,
        'analyst': 4,
        'wissenschaft': 3,
        'regulierung': 4,
        'wettbewerb': 4,
        'competition': 4,
        'daten': 3,
        'data': 3,
        'statistik': 3,
        'markt': 3,
        'pricing': 5,
        'tarif': 5,
        'verkehr': 3,
        'mobilität': 4,
        'transport': 3,
        'international': 2,
        'infrastruktur': 3,
        'bahn': 2,
        'research': 3,
        'projektleitung': 2,
        'projekt': 1
      },
      negativeKeywords: {
        'pflege': -8,
        'assistent': -4,
        'assistenz': -4,
        'empfang': -7,
        'sekretariat': -6,
        'sachbearbeiter': -5,
        'administration': -4,
        'hausdienst': -10,
        'logistik': -3,
        'mechatroniker': -10,
        'reinigung': -10,
        'fahrer': -8,
        'lager': -8,
        'verkauf': -5,
        'vertrieb': -5,
        'kundenberatung': -4,
        'tourismuskauffrau': -8,
        'reiseverkehrskauffrau': -8,
        'security': -5,
        'jurist': -3,
        'informatik': -2,

        'kauffrau': -6,
        'kaufmann': -6,
        'büromanagement': -6,
        'verkäufer': -7,
        'berufskraftfahrer': -10,

        'vulnerability': -6,
        'embedded linux': -8,
        'security vulnerability': -7
      },
      bonusPatterns: {},
      hardReject: [
        'reinigung',
        'lager',
        'tourismuskauffrau',
        'reiseverkehrskauffrau'
      ],
      thresholds: {
        //location bias
        relevant: 7,
        maybe: 4
      }
    },

    zrh: {
      positiveKeywords: {
        'pricing': 6,
        'preis': 5,
        'tarif': 5,
        'strategie': 4,
        'strategisch': 4,
        'strategy': 4,
        'analyse': 4,
        'analyst': 4,
        'wirtschaft': 3,
        'ökonom': 6,
        'oekonom': 6,
        'policy': 4,
        'regulierung': 4,
        'compliance': 2,
        'verfahren': 2,
        'betrieb': 1,
        'projekt': 1,
        'manager': 1,
        'senior': 1
      },
      negativeKeywords: {
        'informatik': -4,
        'ict': -4,
        'sap': -3,
        'tierpfleger': -10,
        'aviatik': -2,
        'jurist': -10,
        'juristin': -10,
        'juristische': -8,
        'recht': -5,
        'security': -4,
        'techniker': -6,
        'elektro': -5,
        'hlks': -6,
        'gebäudetechnik': -6,
        'cargo': -2
      },
      bonusPatterns: {
        'recht & compliance': 2,
        'lärm und verfahren': 2
      },
      hardReject: [
        'tierpfleger',
        'hlks',
        'gebäudetechnik',
        'jurist',
        'juristin',
        'juristische'
      ],
      thresholds: {
        relevant: 8,
        maybe: 4
      }
    },

    airbus: {
      positiveKeywords: {
        'analyst': 5,
        'analysis': 4,
        'data': 4,
        'strategy': 4,
        'strategic': 4,
        'performance': 4,
        'lean': 4,
        'improvement': 3,
        'process': 2,
        'project': 1,
        'business': 2,
        'innovation': 3,
        'planning': 1,
        'transformation': 3,
        'customer service': 2,
        'quality': 2,
        'continuous improvement': 3
      },
      negativeKeywords: {
        'student': -8,
        'trainee': -8,
        'engineer': -4,
        'mechanic': -10,
        'technician': -8,
        'assembly': -8,
        'manufacturing': -3,
        'production': -2,
        'procurement': -2,
        'supply chain': -2,
        'legal': -5,
        'hr': -5,
        'finance': -2,
        'accounting': -4,
        'sales': -4,
        'marketing': -3,
        're:\\balt\\s+2026\\b': -12,
        'industrial': -2,
        'performance improvement': -2,
        'operations': -2,
      },
      bonusPatterns: {
        'data analyst': 4,
        'business analyst': 3,
        'lean expert': 4,
        'customer service lean expert': 4,
        'production performance': 2,
        'continuous improvement': 3
      },
      hardReject: [
        'mechanic',
        'technician',
        're:\\balt\\s+2026\\b'
      ],
      thresholds: {
        relevant: 8,
        maybe: 4
      }
    },

    eu: {
      positiveKeywords: {
        'economist': 6,
        'economic': 2,
        'analyst': 4,
        'policy': 4,
        'competition': 5,
        'transport': 4,
        'mobility': 4,
        'regulation': 4,
        'statistics': 2,
        'finance': 2,
        'pricing': 5,
        'tariff': 5,
        'trade': 3,
        'project manager': 3,
        'project officer': 3,
        'ict': 2,
        'digital': 1,
        'technology': 1,
        'technologies': 1,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3,
        'impact assessment': 4,
        'policy analysis': 4,
        'evaluation': 3,
        'monitoring': 3,
        'governance': 3,
        'framework': 2,
        'implementation': 1,
        'stakeholder': 1,
        'coordination': 1
      },
      negativeKeywords: {
        'secretary': -10,
        'assistant': -7,
        'mail handling': -10,
        'administrative': -5,
        'case handler': -4,
        'security': -2,

        'cybersecurity': -5,
        'security officer': -5,
        'industrial security': -6,
        'security policy': -4,
        'cloud infrastructure': -5,
        'systems and networks': -5,
        'knowledge solutions': -4,
        'information management': -4,
        'facility specialist': -6,
        'press and media': -6,
        'grant assurance': -5,

        'it project': -4,
        'it officer': -4,
        'cybersecurity': -4,
        'security officer': -5,
        'systems engineer': -6,
        'network engineer': -6,
        'facility': -6,
        'project officer': -2,
        'legal': -3
      },
      bonusPatterns: {
        're:\\bfg\\s+iv\\b': 6,
        'european commission': 4,
        'european agency': 3,
        'european union agency': 3,
        'easa': 4,
        'eba': 3,
        'esma': 3,
        'ecb': 4
      },
      hardReject: [
        'ast-sc 1',
        'ast-sc 2',
        'secretary',
        'mail handling'
      ],
      gradePolicy: {
        enabled: true,
        allow: ['fg iv', 'ad 5', 'ad 6', 'ad 7', 'ad 8', 'ad 9'],
        reject: ['fg i', 'fg ii', 'fg iii', 'ast', 'ast-sc', 'ad 10', 'ad 11', 'ad 12', 'ad 13', 'ad 14', 'ad 15']
      },
      thresholds: {
        relevant: 12,
        maybe: 5
      }
    },

    euOther: {
      positiveKeywords: {
        'economist': 6,
        'economic': 2,
        'analyst': 4,
        'policy': 4,
        'competition': 5,
        'transport': 4,
        'mobility': 4,
        'regulation': 4,
        'statistics': 2,
        'finance': 2,
        'pricing': 5,
        'tariff': 5,
        'trade': 3,
        'project manager': 3,
        'project officer': 3,
        'ict': 2,
        'digital': 1,
        'technology': 1,
        'technologies': 1,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3,
        'impact assessment': 4,
        'policy analysis': 4,
        'evaluation': 3,
        'monitoring': 3,
        'governance': 3,
        'framework': 2,
        'implementation': 1,
        'stakeholder': 1,
        'coordination': 1,

        'cybersecurity': -5,
        'security officer': -5,
        'industrial security': -6,
        'security policy': -4,
        'cloud infrastructure': -5,
        'systems and networks': -5,
        'knowledge solutions': -4,
        'information management': -4,
        'facility specialist': -6,
        'press and media': -6,
        'grant assurance': -5
      },
      negativeKeywords: {
        'secretary': -10,
        'assistant': -7,
        'mail handling': -10,
        'administrative': -5,
        'case handler': -4,
        'security': -2,
        'weapons': -10,
        'explosives': -10,
        'defence': -3,

        'it project': -4,
        'it officer': -4,
        'cybersecurity': -4,
        'security officer': -5,
        'systems engineer': -6,
        'network engineer': -6,
        'facility': -6,
        'project officer': -2,
        'legal': -3
      },
      bonusPatterns: {
        're:\\bfg\\s+iv\\b': 6,
        'european commission': 4,
        'european agency': 3,
        'european union agency': 3,
        'easa': 4,
        'eba': 3,
        'esma': 3,
        'ecb': 4
      },
      hardReject: [
        'secretary',
        'mail handling'
      ],
      gradePolicy: {
        enabled: true,
        allow: ['fg iv', 'ad 5', 'ad 6', 'ad 7', 'ad 8', 'ad 9'],
        reject: ['fg i', 'fg ii', 'fg iii', 'ast', 'ast-sc', 'ad 10', 'ad 11', 'ad 12', 'ad 13', 'ad 14', 'ad 15']
      },
      thresholds: {
        relevant: 12,
        maybe: 5
      }
    },

    lh: {
      positiveKeywords: {
        'strategy': 5,
        'pricing': 6,
        'preis': 5,
        'tarif': 5,
        'analyst': 4,
        'analyse': 4,
        'policy': 3,
        'regulierung': 4,
        'competition': 4,
        'manager': 2,
        'senior': 1,
        'digital': 1,
        'ecosystem': 1,
        'mobilität': 3,
        'transport': 3,
        'aviation': 2,
        'network': 2,
        'infrastructure': 3,
        'rail': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'architect': -2,
        'enterprise architect': -4,
        'technik': -3,
        'developer': -4,
        'engineer': -4,
        'operations': -2,
        'tech ops': -2,
        'hr': -5,
        'sales': -5,
        'marketing': -3,
        'praktikum': -12,
        'student': -8,
        'junior': -6
      },
      bonusPatterns: {
        'senior manager strategy': 5,
        'pricing manager': 5,
        'strategy digital': 2
      },
      hardReject: [
        'cabin crew',
        'flugbegleiter',
        'mechanic',
        'technician',
        'praktikum'
      ],
      thresholds: {
        relevant: 9,
        maybe: 4
      }
    },

    skyguide: {
      positiveKeywords: {
        'portfolio': 4,
        'pricing': 6,
        'preis': 5,
        'tarif': 5,
        'strategy': 4,
        'analyst': 4,
        'analyse': 4,
        'policy': 3,
        'regulierung': 4,
        'competition': 4,
        'planning': 1,
        'flow management': 1,
        'business': 2,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'engineer': -5,
        'technical': -4,
        'informatique': -6,
        'it': -5,
        'flugverkehr': -10,
        'fluglots': -10,
        'air traffic control': -10,
        'controller': -6,
        'instructor': -4,
        'training': -3,
        'education': -3,
        'ausbildung': -8,
        'formation': -8
      },
      bonusPatterns: {
        'portfolio specialist': 4,
        'planning & flow management': 1
      },
      hardReject: [
        'air traffic control',
        'fluglots',
        'flugverkehr',
        'ausbildung',
        'formation'
      ],
      thresholds: {
        relevant: 10,
        maybe: 5
      }
    },

    eurocontrol: {
      positiveKeywords: {
        'economist': 6,
        'economic': 4,
        'economics': 4,
        'pricing': 6,
        'price': 5,
        'tariff': 5,
        'strategy': 4,
        'strategic': 4,
        'policy': 4,
        'regulation': 5,
        'regulatory': 5,
        'competition': 5,
        'analysis': 4,
        'analyst': 4,
        'data': 3,
        'analytics': 3,
        'statistics': 3,
        'performance': 3,
        'transport': 3,
        'aviation': 3,
        'air traffic': 3,
        'network': 2,
        'business': 2,
        'solutions': 1,
        'infrastructure': 1,
        'rail': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'architect': -4,
        'cloud': -4,
        'developer': -5,
        'engineer': -5,
        'security': -4,
        'ict': -4,
        'legal': -2,
        'assistant': -6,
        'technical expert': -4,
        'database': -3,
        'system': -2,
      },
      bonusPatterns: {
        're:\\bad\\s*/\\b': 2,
        'data and analytics': 2,
        'business solutions analyst': 2,
        'eurocontrol': 3,
        'network manager': 2
      },
      hardReject: [
        'assistant'
      ],
      thresholds: {
        relevant: 8,
        maybe: 4
      }
    },

    jobroom: {
      positiveKeywords: {
        'ökonom': 6,
        'oekonom': 6,
        'economist': 6,
        'economic': 3,
        'economics': 3,
        'volkswirtschaft': 5,
        'wirtschaft': 3,
        'pricing': 5,
        'preis': 4,
        'tarif': 4,
        'strategie': 4,
        'strategisch': 4,
        'strategy': 4,
        'analyse': 4,
        'analyst': 4,
        'marktanalyse': 4,
        'regulierung': 4,
        'regulation': 4,
        'wettbewerb': 4,
        'competition': 4,
        'mobilität': 4,
        'verkehr': 3,
        'transport': 3,
        'statistik': 3,
        'statistician': 4,
        'aktuar': 4,
        'policy': 4,
        'finanzen': 3,
        'finance': 3,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3,
        // nur wenn kombiniert mit relevanten Kontexten:
        'strategy manager': +2
      },
      negativeKeywords: {
        'gallen': -10,
        'servicemonteur': -10,
        'elektroinstallateur': -10,
        'elektromonteur': -10,
        'nutzfahrzeugmechaniker': -10,
        'fenstermonteur': -10,
        'lüftung': -8,
        'pflege': -8,
        'sozialarbeiter': -6,
        'verkaufsinnendienst': -8,
        'sachbearbeiter': -7,
        'marketing': -6,
        'sales': -6,
        'key account': -6,
        'kampagnenmanager': -6,
        'consultant sea': -7,
        'product manager': -3,
        'crm': -3,
        'workmanagement': -6
      },
      bonusPatterns: {
        'volkswirtschaft': 2,
        'preisstrategie': 3,
        'revenue management': 4
      },
      hardReject: [],
      thresholds: {
        relevant: 6,
        maybe: 4
      }
    },

    db: {
      positiveKeywords: {
        'ökonom': 6,
        'oekonom': 6,
        'economist': 6,
        'economic': 3,
        'economics': 3,
        'strategie': 4,
        'strategisch': 4,
        'strategy': 4,
        'analyst': 5,
        'analyse': 4,
        'markt': 3,
        'marktanalyse': 4,
        'regulierung': 5,
        'regulation': 5,
        'wettbewerb': 5,
        'competition': 5,
        'policy': 4,
        'transformation': 3,
        'fachreferent': 1,
        'monitoring': 1,
        'steuerung': 1,
        'finanz': 1,
        'finanzen': 1,
        'infrastructure': 3,
        'network': 2,
        'rail': 3,
        'aviation': 3,
        'air traffic': 3,
        'market design': 4,
        'energy market': 4,
        'electricity market': 4,
        'revenue management': 3
      },
      negativeKeywords: {
        'lokführer': -10,
        'fahrdienstleiter': -10,
        'zugverkehrssteuerer': -10,
        'mechatroniker': -10,
        'elektriker': -10,
        'technik': -3,
        'techniker': -6,
        'werkstatt': -8,
        'instandhaltung': -8,
        'gleisbauer': -10,
        'schlosser': -10,
        'reinigung': -10,
        'küche': -10,
        'security': -5,
        'vertrieb': -5,
        'verkauf': -5,
        'hr': -5,
        'jurist': -8,
        'juristin': -8,
        'recht': -4,
        'arbeitsrecht': -8,
        'rechtsreferendariat': -12,
        'rechtsreferendar': -12,
        'tarifrecht': -10,
        'tarifpolitik': -10,
        'ingenieur': -6,
        'bauingenieur': -10,
        'projektingenieur': -10,
        'geotechnik': -10,
        'hydrogeologie': -10,
        'gleisbau': -8,
        'gleisbaumaschinen': -8,
        'fahrbahn': -8,
        'hkls': -10,
        'heizung': -10,
        'kälte': -10,
        'lüftung': -10,
        'telekommunikation': -4,
        'architektur': -3,
        'touristik': -6,
        'empfangsgebäude': -6,
        'sachbearbeiter': -8,
        'programmleiter': -4,
        'projektentwickler': -6,
        'personalmanagement': -6,
        'kundenkommunikation': -6
      },
      bonusPatterns: {
        'regulierung': 2,
        'wettbewerb': 2,
        'marktanalyse': 2,
        'strategie': 1
      },
      hardReject: [
        'lokführer',
        'fahrdienstleiter',
        'zugverkehrssteuerer',
        'mechatroniker',
        'elektriker',
        'gleisbauer',
        'schlosser',
        'reinigung',
        'küche',
        'bauingenieur',
        'projektingenieur',
        'geotechnik',
        'hydrogeologie',
        'hkls',
        'heizung',
        'kälte',
        'lüftung',
        'rechtsreferendariat',
        'rechtsreferendar',
        'arbeitsrecht',
        'servicetechniker*',
        'tarifrecht',
        'tarifpolitik'
      ],
      thresholds: {
        relevant: 6,
        maybe: 2
      }
    }
  },

  roleModel: {
    titlePositiveKeywords: {
    },

    contextPositiveKeywords: {
    },

    hardReject: [
      'hochschulprakt*',
      'praktikant',
      'werkstudent',
      'working student',
      'internship',
      'stagiaire',
      'apprentice',
      'apprenti',
      'alternant',
      'alternance',
      'apprenticeship',

      'mechaniker',
      'installateur',
      'monteur',
      'schreiner',
      'sanitär',
      'lackierer',
      'baumaschinenführer',
      'automobilfachmann',

      'koch',
      'köchin',
      'hauswirtschaft',
      'kasse',
      'employé de maison',

      'pflegefach*',
      'pflegehelfer',
      'pflegeassistenz',
      'altenpflege',
      'krankenpflege'
    ],

    enabledSources: [
      'jobroom',
      'bundde',
      'bundch',
      'eucareers',
      'eurocontrol',
      'lh',
      'zrh',
      'airbus',
      'skyguide',
      'oebb',
      'sbb',
      'kn',
      'db'
    ]
  },
  notification: {
    recipient: Session.getActiveUser().getEmail(),
    subjectPrefix: '[Job-Alert Elmar] ',
  },
recency: {
  bundLookbackDays: 21,
  oebbLookbackDays: 21,
  sbbLookbackDays: 21,
  knLookbackDays: 21,
  lhLookbackDays: 21,
  zrhLookbackDays: 21,
  airbusLookbackDays: 21,
  staleIrrelevantDays: 30, //when job becomes stale in Relevant_All
  staleStatusDays: 28, //when job becomes stale in Jobs_All
  temporaryNewFlagDays: 1,
},
  bundDetail: {
    enabled: true,
    maxFetchesPerRun: 15,
    maxBoost: 10,
    triggerTitlePatterns: [
    'mathematik',
    'modell',
    'analyst',
    'analyse',
    'wissenschaft',
    'ökonom',
    'oekonom',
    'policy',
    'strategie',
    'regulierung',
    'wettbewerb',
    'finanz',
    'versicherung',
    'leiter',
    'leitung'
    ],
    positiveKeywords: {
      'quantitativ': 3,
      'modell': 3,
      'modelle': 3,
      'perspektivmodell': 4,
      'berechnungsmodell': 4,
      'finanzplanung': 4,
      'finanzhaushalt': 3,
      'gesetzgebung': 3,
      'parlamentarisch': 3,
      'parlamentarische': 3,
      'entscheidungsgrundlagen': 3,
      'aktuariell': 3,
      'versicherungsmathematik': 4,
      'sozialversicherungen': 3,
      'wirtschaftswissenschaften': 3,
      'politik': 2,
      'steuerung': 2,
      'prognose': 3,
      'prognosen': 3,
      'simulation': 3,
      'szenarien': 2,
      'wirkungsanalyse': 3
    },
    negativeKeywords: {
      'sekretariat': -5,
      'administrative unterstützung': -5,
      'empfang': -8
    },
    bonusPatterns: {
      'erste säule': 2,
      'zweite säule': 2,
      'ahv': 2,
      'bv': 2,
      'bsv': 2
    },
  },
  airbusDetail: {
  enabled: true,
  maxFetchesPerRun: 8
},
};

const JOBS_ALL_ACTIVE_COLUMNS = [
  'unique_key',
  'source',
  'source_label',
  'raw_source_id',
  'url',
  'title',
  'employer',
  'location',
  'mail_date',
  'deadline',
  'percent_or_workload',
  'grade',
  'domain',
  'dg',
  'raw_snippet',
  'detail_text',
  'score',
  'score_normalized',
  'category',
  'positive_hits',
  'negative_hits',
  'hard_reject_hit',
  'first_seen_at',
  'last_seen_at',
  'notified_at',
  'run_id',
  'archived_at',
  'archive_reason'
];

const JOBS_ALL_LEGACY_COLUMNS = [
  'new_flag',
  'quick_flag',
  'final_score',
  'final_category',
  'application_status',
  'status',
  'manual_category_override',
  'manual_score_delta',
  'learn_from_feedback',
  'notes',
  'feedback_learned_at',
  'feedback_learning_version'
];

const JOBS_ALL_COLUMNS = JOBS_ALL_ACTIVE_COLUMNS;


const NOTIFIED_COLUMNS = [
'unique_key',
'notified_at',
'category',
'score',
'title',
'employer',
'location',
'url',
'source',
];


const SCAN_LOG_COLUMNS = [
  'run_at',
  'run_id',
  'source',
  'mode',
  'label_or_endpoint',
  'mail_threads',
  'mail_messages',
  'items_seen',
  'jobs_parsed',
  'rows_input_to_upsert',
  'jobs_upserted',
  'new_jobs',
  'updated_jobs',
  'relevant_count',
  'maybe_count',
  'ignore_count',
  'detail_fetch_attempted',
  'detail_fetch_count',
  'duration_ms',
  'status',
  'message',
];

const SCORING_COCKPIT_COLUMNS = [
  'source',
  'location',
  'title',
  'employer',

  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'notes',

  'category',
  'score',
  'score_normalized',
  'hard_reject_hit',

  'deadline',
  'mail_date',
  'grade',
  'percent_or_workload',
  'domain',
  'dg',
  'source_label',

  'positive',
  'negative',

  'url',
  'unique_key'
];

const SCORING_COCKPIT_EDITABLE_COLUMNS = [
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'notes'
];


let LEARNING_CACHE = null;
let BUND_DETAIL_FETCH_COUNT = 0;



// *****************************************
// DELME
// *****************************************
function delme(){
Logger.log(
  matchesConfiguredKeyword_(
    normalizeText_('Servicetechniker:in Kabeltechnik'),
    'servicetechniker*'
  )
);
}


function debugKeywordMatching() {
  const cases = [
    ['intern', 'international affairs manager'],
    ['intern', 'internship programme'],
    ['hochschulprakt*', 'hochschulpraktikum governance'],
    ['pflegefach*', 'pflegefachkraft hf'],
    ['strateg', 'strategie und steuerung'],
    ['strateg', 'strategic pricing manager'],
    ['working student', 'working student finance'],
    ['air traffic', 'air traffic management analyst'],
    ['re:\\bfg\\s+iv\\b', 'fg iv policy officer']
  ];

  cases.forEach(([keyword, text]) => {
    Logger.log(
      'keyword="' + keyword + '" | text="' + text + '" | match=' +
      matchesConfiguredKeyword_(text, keyword)
    );
  });
}


function auditRoleModelImpact_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      rows_seen: 0,
      rows_analyzed: 0,
      rows_with_role_impact: 0,
      avg_role_delta: 0,
      avg_role_share_of_total: 0,
      avg_role_vs_source: 0
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const requiredCols = [
    'unique_key',
    'source',
    'source_label',
    'raw_source_id',
    'url',
    'title',
    'employer',
    'location',
    'mail_date',
    'deadline',
    'percent_or_workload',
    'grade',
    'domain',
    'dg',
    'raw_snippet',
    'detail_text'
  ];

  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error('Required column missing in Jobs_All: ' + col);
    }
  });

  const out = [];
  let rowsAnalyzed = 0;
  let rowsWithRoleImpact = 0;
  let roleDeltaSum = 0;
  let roleShareSum = 0;
  let roleVsSourceSum = 0;
  let roleShareCount = 0;
  let roleVsSourceCount = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source] || '',
      source_label: row[idx.source_label] || '',
      raw_source_id: row[idx.raw_source_id] || '',
      url: row[idx.url] || '',
      title: row[idx.title] || '',
      employer: row[idx.employer] || '',
      location: row[idx.location] || '',
      mail_date: row[idx.mail_date] || '',
      deadline: row[idx.deadline] || '',
      percent_or_workload: row[idx.percent_or_workload] || '',
      grade: row[idx.grade] || '',
      domain: row[idx.domain] || '',
      dg: row[idx.dg] || '',
      raw_snippet: row[idx.raw_snippet] || '',
      detail_text: row[idx.detail_text] || ''
    };

    const source = String(job.source || '').toLowerCase();
    let rules = null;

    if (source === 'bundch') rules = CONFIG.scoring.bund;
    else if (source === 'bundde') rules = CONFIG.scoring.bundde;
    else if (source === 'oebb') rules = CONFIG.scoring.oebb;
    else if (source === 'sbb') rules = CONFIG.scoring.sbb;
    else if (source === 'eucareers') {
      rules = job.source_label === 'Crawler/EU-other'
        ? CONFIG.scoring.euOther
        : CONFIG.scoring.eu;
    }
    else if (source === 'lh') rules = CONFIG.scoring.lh;
    else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
    else if (source === 'kn') rules = CONFIG.scoring.kn;
    else if (source === 'zrh') rules = CONFIG.scoring.zrh;
    else if (source === 'airbus') rules = CONFIG.scoring.airbus;
    else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
    else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
    else if (source === 'db') rules = CONFIG.scoring.db;

    if (!rules) continue;

    rowsAnalyzed++;

    const gradePolicyResult = applyGradePolicy_(job, rules);

    let sourceScore = 0;
    let sourcePositive = [];
    let sourceNegative = [];
    let detailScore = 0;
    let detailPositive = [];
    let detailNegative = [];
    let learningDelta = 0;
    let learningPositive = [];
    let learningNegative = [];
    let dgDelta = 0;
    let dgPositive = [];
    let dgNegative = [];
    let locationBoost = 0;
    let locationPositive = [];
    let roleDelta = 0;
    let rolePositive = [];
    let roleNegative = [];
    let roleHardReject = false;

    const textForScoring = [
      job.title,
      job.percent_or_workload,
      job.grade,
      job.domain,
      job.dg,
      job.location,
      job.employer
    ].filter(Boolean).join(' ');

    if (!gradePolicyResult) {
      const sourceResult = scoreEntry_(
        textForScoring,
        rules.positiveKeywords,
        rules.negativeKeywords,
        rules.bonusPatterns
      );

      sourceScore = Number(sourceResult.score) || 0;
      sourcePositive = sourceResult.positive || [];
      sourceNegative = sourceResult.negative || [];

      if (source === 'bundch' && job.detail_text) {
        const detailResult = scoreEntry_(
          job.detail_text,
          CONFIG.bundDetail.positiveKeywords,
          CONFIG.bundDetail.negativeKeywords,
          CONFIG.bundDetail.bonusPatterns
        );

        detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, Number(detailResult.score) || 0));
        detailPositive = (detailResult.positive || []).map(hit => 'DETAIL:' + hit);
        detailNegative = (detailResult.negative || []).map(hit => 'DETAIL:' + hit);
      }

      const learning = getLearningAdjustment_(job);
      learningDelta = Number(learning.delta) || 0;
      learningPositive = learning.positive || [];
      learningNegative = learning.negative || [];

      const dgAdjustment = getEuDgAdjustment_(job);
      dgDelta = Number(dgAdjustment.delta) || 0;
      dgPositive = dgAdjustment.positive || [];
      dgNegative = dgAdjustment.negative || [];

      if (source === 'bundde') {
        locationBoost = Number(getBundDeLocationBoost_(job.location)) || 0;
        locationPositive = getBundDeLocationPositiveHits_(job.location) || [];
      }

      const roleModel = scoreRoleModel_(job);
      roleDelta = Number(roleModel.delta) || 0;
      rolePositive = roleModel.positive || [];
      roleNegative = roleModel.negative || [];
      roleHardReject = !!roleModel.hardRejectHit;
    }

    const sourceOnlyScore =
      (gradePolicyResult ? -999 : 0) +
      sourceScore +
      detailScore +
      learningDelta +
      dgDelta +
      locationBoost;

    const withRoleScore = sourceOnlyScore + roleDelta;

    const thresholds = getSourceThresholds_(job.source, job.source_label);

    const sourceOnlyNormalized =
      sourceOnlyScore === -999
        ? -999
        : normalizeScoreByThresholds_(sourceOnlyScore, thresholds);

    const withRoleNormalized =
      withRoleScore === -999
        ? -999
        : normalizeScoreByThresholds_(withRoleScore, thresholds);

    let sourceOnlyCategory = gradePolicyResult
      ? gradePolicyResult.category
      : assignCategory_(
          textForScoring,
          sourceOnlyScore,
          rules.hardReject || [],
          rules.thresholds
        );

    if (roleHardReject) {
      // current live system would still force ignore even if source-only looked okay
      // keep this explicit so the output is interpretable
    }

    let withRoleCategory = gradePolicyResult
      ? gradePolicyResult.category
      : assignCategory_(
          textForScoring,
          withRoleScore,
          rules.hardReject || [],
          rules.thresholds
        );

    if (roleHardReject) {
      withRoleCategory = 'Ignorieren';
    }

    const roleShareOfTotal =
      withRoleScore !== 0 ? roleDelta / withRoleScore : 0;

    const roleVsSource =
      sourceOnlyScore !== 0 ? roleDelta / sourceOnlyScore : '';

    if (roleDelta !== 0) rowsWithRoleImpact++;
    roleDeltaSum += roleDelta;

    if (withRoleScore !== 0) {
      roleShareSum += roleShareOfTotal;
      roleShareCount++;
    }

    if (sourceOnlyScore !== 0) {
      roleVsSourceSum += Number(roleVsSource) || 0;
      roleVsSourceCount++;
    }

    out.push({
      unique_key: row[idx.unique_key] || '',
      source: job.source || '',
      title: job.title || '',
      employer: job.employer || '',
      location: job.location || '',
      source_only_score: sourceOnlyScore,
      role_delta: roleDelta,
      with_role_score: withRoleScore,
      source_only_normalized: sourceOnlyNormalized,
      with_role_normalized: withRoleNormalized,
      source_only_category: sourceOnlyCategory,
      with_role_category: withRoleCategory,
      role_hard_reject: roleHardReject ? 'yes' : '',
      role_share_of_total: round4_(roleShareOfTotal),
      role_vs_source: roleVsSource === '' ? '' : round4_(roleVsSource),
      source_positive_hits: sourcePositive.concat(detailPositive, learningPositive, dgPositive, locationPositive).join(', '),
      source_negative_hits: sourceNegative.concat(detailNegative, learningNegative, dgNegative).join(', '),
      role_positive_hits: rolePositive.join(', '),
      role_negative_hits: roleNegative.join(', ')
    });
  }

  out.sort((a, b) => {
    const diff = Math.abs(Number(b.role_delta || 0)) - Math.abs(Number(a.role_delta || 0));
    if (diff !== 0) return diff;

    const shareDiff = Math.abs(Number(b.role_share_of_total || 0)) - Math.abs(Number(a.role_share_of_total || 0));
    if (shareDiff !== 0) return shareDiff;

    return String(a.source || '').localeCompare(String(b.source || ''));
  });

  const result = {
    rows_seen: data.length - 1,
    rows_analyzed: rowsAnalyzed,
    rows_with_role_impact: rowsWithRoleImpact,
    avg_role_delta: round4_(rowsAnalyzed ? roleDeltaSum / rowsAnalyzed : 0),
    avg_role_share_of_total: round4_(roleShareCount ? roleShareSum / roleShareCount : 0),
    avg_role_vs_source: round4_(roleVsSourceCount ? roleVsSourceSum / roleVsSourceCount : 0),
    top_examples: out.slice(0, 25)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function round4_(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}


function auditRoleModelRankingShift_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      rows_seen: 0,
      rows_analyzed: 0,
      changed_rank_positions_top100: 0,
      top100_current: [],
      top100_without_role: []
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source] || '',
      source_label: row[idx.source_label] || '',
      raw_source_id: row[idx.raw_source_id] || '',
      url: row[idx.url] || '',
      title: row[idx.title] || '',
      employer: row[idx.employer] || '',
      location: row[idx.location] || '',
      mail_date: row[idx.mail_date] || '',
      deadline: row[idx.deadline] || '',
      percent_or_workload: row[idx.percent_or_workload] || '',
      grade: row[idx.grade] || '',
      domain: row[idx.domain] || '',
      dg: row[idx.dg] || '',
      raw_snippet: row[idx.raw_snippet] || '',
      detail_text: row[idx.detail_text] || ''
    };

    const source = String(job.source || '').toLowerCase();
    let rules = null;

    if (source === 'bundch') rules = CONFIG.scoring.bund;
    else if (source === 'bundde') rules = CONFIG.scoring.bundde;
    else if (source === 'oebb') rules = CONFIG.scoring.oebb;
    else if (source === 'sbb') rules = CONFIG.scoring.sbb;
    else if (source === 'eucareers') {
      rules = job.source_label === 'Crawler/EU-other'
        ? CONFIG.scoring.euOther
        : CONFIG.scoring.eu;
    }
    else if (source === 'lh') rules = CONFIG.scoring.lh;
    else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
    else if (source === 'kn') rules = CONFIG.scoring.kn;
    else if (source === 'zrh') rules = CONFIG.scoring.zrh;
    else if (source === 'airbus') rules = CONFIG.scoring.airbus;
    else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
    else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
    else if (source === 'db') rules = CONFIG.scoring.db;

    if (!rules) continue;

    const gradePolicyResult = applyGradePolicy_(job, rules);
    let sourceOnlyScore = 0;
    let withRoleScore = 0;
    let roleDelta = 0;

    if (gradePolicyResult) {
      sourceOnlyScore = -999;
      withRoleScore = -999;
    } else {
      const textForScoring = [
        job.title,
        job.percent_or_workload,
        job.grade,
        job.domain,
        job.dg,
        job.location,
        job.employer
      ].filter(Boolean).join(' ');

      const sourceResult = scoreEntry_(
        textForScoring,
        rules.positiveKeywords,
        rules.negativeKeywords,
        rules.bonusPatterns
      );

      let detailScore = 0;
      if (source === 'bundch' && job.detail_text) {
        const detailResult = scoreEntry_(
          job.detail_text,
          CONFIG.bundDetail.positiveKeywords,
          CONFIG.bundDetail.negativeKeywords,
          CONFIG.bundDetail.bonusPatterns
        );
        detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, Number(detailResult.score) || 0));
      }

      const learning = getLearningAdjustment_(job);
      const dgAdjustment = getEuDgAdjustment_(job);
      const locationBoost = source === 'bundde'
        ? Number(getBundDeLocationBoost_(job.location)) || 0
        : 0;

      const roleModel = scoreRoleModel_(job);

      sourceOnlyScore =
        (Number(sourceResult.score) || 0) +
        detailScore +
        (Number(learning.delta) || 0) +
        (Number(dgAdjustment.delta) || 0) +
        locationBoost;

      roleDelta = Number(roleModel.delta) || 0;
      withRoleScore = sourceOnlyScore + roleDelta;
    }

    rows.push({
      unique_key: row[idx.unique_key] || '',
      source: job.source || '',
      title: job.title || '',
      employer: job.employer || '',
      current_score: withRoleScore,
      no_role_score: sourceOnlyScore,
      role_delta: roleDelta
    });
  }

  const currentSorted = rows.slice().sort(compareAuditRowsByCurrentScore_);
  const noRoleSorted = rows.slice().sort(compareAuditRowsByNoRoleScore_);

  const currentTop100 = currentSorted.slice(0, 100);
  const noRoleTop100 = noRoleSorted.slice(0, 100);

  const currentPos = {};
  const noRolePos = {};

  currentTop100.forEach((row, i) => currentPos[row.unique_key] = i + 1);
  noRoleTop100.forEach((row, i) => noRolePos[row.unique_key] = i + 1);

  const unionKeys = [...new Set(
    currentTop100.map(r => r.unique_key).concat(noRoleTop100.map(r => r.unique_key))
  )];

  const changes = unionKeys.map(key => {
    const currentRank = currentPos[key] || '';
    const noRoleRank = noRolePos[key] || '';

    const currentRow = currentTop100.find(r => r.unique_key === key);
    const noRoleRow = noRoleTop100.find(r => r.unique_key === key);
    const ref = currentRow || noRoleRow;

    return {
      unique_key: key,
      source: ref ? ref.source : '',
      title: ref ? ref.title : '',
      employer: ref ? ref.employer : '',
      current_rank: currentRank,
      no_role_rank: noRoleRank,
      current_score: currentRow ? currentRow.current_score : '',
      no_role_score: noRoleRow ? noRoleRow.no_role_score : '',
      role_delta: ref ? ref.role_delta : '',
      rank_shift: computeRankShift_(currentRank, noRoleRank)
    };
  });

  changes.sort((a, b) => {
    const da = Math.abs(Number(a.rank_shift) || 999);
    const db = Math.abs(Number(b.rank_shift) || 999);
    return db - da;
  });

  const changedRankPositionsTop100 = changes.filter(x => x.current_rank !== x.no_role_rank).length;

  const result = {
    rows_seen: data.length - 1,
    rows_analyzed: rows.length,
    changed_rank_positions_top100: changedRankPositionsTop100,
    top100_current: currentTop100.slice(0, 20),
    top100_without_role: noRoleTop100.slice(0, 20),
    biggest_shifts: changes.slice(0, 30)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function compareAuditRowsByCurrentScore_(a, b) {
  const s = (Number(b.current_score) || 0) - (Number(a.current_score) || 0);
  if (s !== 0) return s;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function compareAuditRowsByNoRoleScore_(a, b) {
  const s = (Number(b.no_role_score) || 0) - (Number(a.no_role_score) || 0);
  if (s !== 0) return s;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function computeRankShift_(currentRank, noRoleRank) {
  if (currentRank === '' || noRoleRank === '') return '';
  return Number(noRoleRank) - Number(currentRank);
}


function auditRoleModelImpact() {
  return auditRoleModelImpact_();
}

function auditRoleModelRankingShift() {
  return auditRoleModelRankingShift_();
}



function auditRoleModelImpact_light() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  let roleShareSum = 0;
  let roleShareCount = 0;

  let roleVsSourceSum = 0;
  let roleVsSourceCount = 0;

  const outliers = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const job = {
      source: row[idx.source],
      title: row[idx.title],
      employer: row[idx.employer]
    };

    const scoring = computeScoresForAudit_(row, idx); // wir kapseln das gleich

    if (!scoring) continue;

    const { sourceScore, roleDelta, totalScore } = scoring;

    if (totalScore !== 0) {
      const share = roleDelta / totalScore;
      roleShareSum += share;
      roleShareCount++;

      // OUTLIER: Role Model dominiert
      if (Math.abs(share) > 0.4) {
        outliers.push({
          title: job.title,
          source: job.source,
          role_share: round4_(share),
          role_delta: roleDelta,
          total: totalScore
        });
      }
    }

    if (sourceScore !== 0) {
      roleVsSourceSum += roleDelta / sourceScore;
      roleVsSourceCount++;
    }
  }

  const result = {
    avg_role_share: round4_(roleShareSum / roleShareCount),
    avg_role_vs_source: round4_(roleVsSourceSum / roleVsSourceCount),
    outliers_top: outliers.slice(0, 15)
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function auditRoleModelRankingShift_light() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = [];

  for (let r = 1; r < data.length; r++) {
    const scoring = computeScoresForAudit_(data[r], idx);
    if (!scoring) continue;

    rows.push({
      key: data[r][idx.unique_key],
      title: data[r][idx.title],
      current: scoring.totalScore,
      noRole: scoring.sourceScore
    });
  }

  const topCurrent = rows.slice().sort((a,b)=>b.current-a.current).slice(0,50);
  const topNoRole = rows.slice().sort((a,b)=>b.noRole-a.noRole).slice(0,50);

  const setCurrent = new Set(topCurrent.map(r=>r.key));
  const setNoRole = new Set(topNoRole.map(r=>r.key));

  let overlap = 0;
  setCurrent.forEach(k => { if (setNoRole.has(k)) overlap++; });

  const result = {
    overlap_top50: overlap,
    changed: 50 - overlap
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function computeScoresForAudit_(row, idx) {
  const source = String(row[idx.source] || '').toLowerCase();
  const job = {
    source: row[idx.source],
    source_label: row[idx.source_label],
    title: row[idx.title],
    employer: row[idx.employer],
    location: row[idx.location],
    detail_text: row[idx.detail_text],
    domain: row[idx.domain],
    dg: row[idx.dg]
  };

  let rules = null;

  if (source === 'bundch') rules = CONFIG.scoring.bund;
  else if (source === 'bundde') rules = CONFIG.scoring.bundde;
  else if (source === 'oebb') rules = CONFIG.scoring.oebb;
  else if (source === 'sbb') rules = CONFIG.scoring.sbb;
  else if (source === 'eucareers') {
    rules = job.source_label === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther
      : CONFIG.scoring.eu;
  }
  else if (source === 'lh') rules = CONFIG.scoring.lh;
  else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
  else if (source === 'kn') rules = CONFIG.scoring.kn;
  else if (source === 'zrh') rules = CONFIG.scoring.zrh;
  else if (source === 'airbus') rules = CONFIG.scoring.airbus;
  else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
  else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
  else if (source === 'db') rules = CONFIG.scoring.db;

  if (!rules) return null;

  const text = [
    job.title,
    job.location,
    job.employer,
    job.domain,
    job.dg
  ].filter(Boolean).join(' ');

  const base = scoreEntry_(
    text,
    rules.positiveKeywords,
    rules.negativeKeywords,
    rules.bonusPatterns
  );

  const role = scoreRoleModel_(job);

  return {
    sourceScore: Number(base.score) || 0,
    roleDelta: Number(role.delta) || 0,
    totalScore: (Number(base.score) || 0) + (Number(role.delta) || 0)
  };
}

// *****************************************
// TEMPORÄR NÜTZLICH?
// *****************************************



// *****************************************
// 2. ÖFFENTLICHE EINSTIEGSPUNKTE
// *****************************************


function zzz_ADMIN_reorderJobsAllToCurrentSchema() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Diese Funktion sortiert Jobs_All neu, in Übereinstimmung mit JOBS_ALL_COLUMNS',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  reorderJobsAllToCurrentSchema_();
}

/**
 * Utility: Reorders Jobs_All to match JOBS_ALL_COLUMNS.
 * Safe to run after changing column order in JOBS_ALL_COLUMNS.
 * Not used in normal pipeline.
 */
function reorderJobsAllToCurrentSchema_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All not found');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length).setValues([JOBS_ALL_COLUMNS]);
    return;
  }

  const currentHeaders = data[0].map(h => String(h || '').trim());
  const currentIdx = indexMap_(currentHeaders);
  const rows = data.slice(1);

  const reorderedRows = rows.map(row => {
    return JOBS_ALL_COLUMNS.map(col => {
      const pos = currentIdx[col];
      return pos == null ? '' : row[pos];
    });
  });

  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, JOBS_ALL_COLUMNS.length).setValues([JOBS_ALL_COLUMNS]);

  if (reorderedRows.length) {
    sheet.getRange(2, 1, reorderedRows.length, reorderedRows[0].length).setValues(reorderedRows);
  }

  formatSheetByCategory_(sheet);
}


function zzz_ADMIN_setupJobSheets() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  setupJobSheets_();
}


function setupJobSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheetWithHeaders_(ss, CONFIG.sheets.jobsAll, JOBS_ALL_COLUMNS);
  ensureSheetWithHeaders_(ss, CONFIG.sheets.notifiedAll, NOTIFIED_COLUMNS);

  if (CONFIG.sheets.scanLog) {
    ensureSheetWithHeaders_(ss, CONFIG.sheets.scanLog, SCAN_LOG_COLUMNS);
  }
}


function validateCoreSheetSchemas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const notifiedSheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);

  if (jobsSheet) assertSheetHeadersExact_(jobsSheet, JOBS_ALL_COLUMNS);
  if (notifiedSheet) assertSheetHeadersExact_(notifiedSheet, NOTIFIED_COLUMNS);

  if (CONFIG.sheets.scanLog) {
    const scanLogSheet = ss.getSheetByName(CONFIG.sheets.scanLog);
    if (scanLogSheet) assertSheetHeadersExact_(scanLogSheet, SCAN_LOG_COLUMNS);
  }
}



function scanAllJobSources() {
  BUND_DETAIL_FETCH_COUNT = 0;
  setupJobSheets_();
  refreshLearningCache_();

  const runId = Utilities.getUuid();

  function safeRun_(fn, name) {
    const startedAt = new Date();
    try {
      const result = fn() || {};
      const finishedAt = new Date();

      appendScanLogRow_(Object.assign({
        run_at: startedAt,
        run_id: runId,
        source: name,
        mode: '',
        label_or_endpoint: '',
        mail_threads: 0,
        mail_messages: 0,
        items_seen: 0,
        jobs_parsed: 0,
        rows_input_to_upsert: 0,
        jobs_upserted: 0,
        new_jobs: 0,
        updated_jobs: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        detail_fetch_attempted: 0,
        detail_fetch_count: 0,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        status: 'ok',
        message: ''
      }, result));
    } catch (e) {
      const finishedAt = new Date();

      Logger.log('ERROR in ' + name + ': ' + e);
      appendScanLogRow_({
        run_at: startedAt,
        run_id: runId,
        source: name,
        mode: '',
        label_or_endpoint: '',
        mail_threads: 0,
        mail_messages: 0,
        items_seen: 0,
        jobs_parsed: 0,
        rows_input_to_upsert: 0,
        jobs_upserted: 0,
        new_jobs: 0,
        updated_jobs: 0,
        relevant_count: 0,
        maybe_count: 0,
        ignore_count: 0,
        detail_fetch_attempted: 0,
        detail_fetch_count: 0,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        status: 'error',
        message: String(e)
      });
    }
  }

  safeRun_(() => scanBundDeRssToAll(runId), 'BundDE');
  safeRun_(() => scanBundJobsToAll(runId), 'BundCH');
  safeRun_(() => scanOebbJobsToAll(runId), 'OEBB');
  safeRun_(() => scanSbbJobsToAll(runId), 'SBB');
  safeRun_(() => scanLhJobsToAll(runId), 'LH');
  safeRun_(() => scanLhApiJobsToAll(runId), 'LH-Crawler');
  safeRun_(() => scanAirbusJobsToAll(runId), 'Airbus');
  safeRun_(() => scanKnJobsToAll(runId), 'KN');
  safeRun_(() => scanKnCrawlerJobsToAll(runId), 'KN-Crawler');
  safeRun_(() => scanEuCareersJobsToAll(runId), 'EU');
  safeRun_(() => scanSkyguideJobsToAll(runId), 'Skyguide');
  safeRun_(() => scanZrhJobsToAll(runId), 'ZRH');
  safeRun_(() => scanEurocontrolJobsToAll(runId), 'Eurocontrol');
  safeRun_(() => scanJobRoomJobsToAll(runId), 'JobRoom');
  safeRun_(() => scanDbJobsToAll(runId), 'DB');

  emailNewRelevantJobs(runId);

  buildSourceHealthView_();

  formatJobsAllScoreColumns_();
  SpreadsheetApp.flush();
Logger.log('Before buildJobsCockpit_');
  safeRun_(() => buildJobsCockpit_(), 'SYSTEM: Cockpit');
  //buildJobsCockpit_();
Logger.log('After buildJobsCockpit_');


  //formatAllSheets();
}



function buildScanSummaryFromLogXXX_() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.scanLog);

  if (!sheet) return '';

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return '';

  const headers = data[0];
  const rows = data.slice(-15); // letzte Runs

  const idx = indexMap_(headers);

  let out = 'SCAN SUMMARY\n\n';

  rows.forEach(row => {

    const source = row[idx.source] || '';

    const newJobs = Number(row[idx.new_jobs] || 0);
    const updated = Number(row[idx.updated_jobs] || 0);

    const relevant = Number(row[idx.relevant_count] || 0);
    const maybe = Number(row[idx.maybe_count] || 0);
    const ignore = Number(row[idx.ignore_count] || 0);

    out +=
      source.padEnd(12) +
      ` new:${newJobs} upd:${updated} | ` +
      `rel:${relevant} maybe:${maybe} ign:${ignore}\n`;

  });

  out += '\n';

  return out;

}


function buildScanSummarySinceLastMail_(runId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) return '';

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return '';

  const headers = data[0];
  const rows = data.slice(1);
  const idx = indexMap_(headers);

  let lastMailAt = null;

  rows.forEach(row => {
    const notifiedAt = row[idx.notified_at];
    if (notifiedAt instanceof Date && !isNaN(notifiedAt.getTime())) {
      if (!lastMailAt || notifiedAt > lastMailAt) {
        lastMailAt = notifiedAt;
      }
    }
  });

  const newRows = rows.filter(row => {
    const firstSeenAt = row[idx.first_seen_at];

    if (!(firstSeenAt instanceof Date) || isNaN(firstSeenAt.getTime())) {
      return false;
    }

    if (lastMailAt) {
      return firstSeenAt > lastMailAt;
    }

    return runId
      ? String(row[idx.run_id] || '') === String(runId)
      : false;
  });

  if (!newRows.length) return '';

  const grouped = {};

  newRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    const category = String(row[idx.category] || 'Ignorieren');

    if (!grouped[source]) {
      grouped[source] = {
        total: 0,
        relevant: 0,
        maybe: 0,
        ignore: 0
      };
    }

    grouped[source].total++;

    if (category === 'Relevant') grouped[source].relevant++;
    else if (category === 'Vielleicht') grouped[source].maybe++;
    else grouped[source].ignore++;
  });

  let total = 0;
  let totalRelevant = 0;
  let totalMaybe = 0;
  let totalIgnore = 0;

  let out = 'SCAN SUMMARY (seit letzter Mail)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const g = grouped[source];

    total += g.total;
    totalRelevant += g.relevant;
    totalMaybe += g.maybe;
    totalIgnore += g.ignore;

    out +=
      source.padEnd(12) +
      ` neu:${g.total} | ` +
      `rel:${g.relevant} maybe:${g.maybe} ign:${g.ignore}\n`;
  });

  out += '\n';
  out +=
    'GESAMT'.padEnd(12) +
    ` neu:${total} | ` +
    `rel:${totalRelevant} maybe:${totalMaybe} ign:${totalIgnore}\n\n`;

  return out;
}







function emailNewRelevantJobs(runId) {
  runId = runId || '';

  const derived = buildDerivedJobViews_();
  const ss = derived.ss;
  const jobsSheet = derived.masterSheet;
  const notifiedSheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);

  if (!jobsSheet) throw new Error('Bitte zuerst setupJobSheets() ausführen.');
  if (!derived.masterRows.length) return;

  const jobsHeaders = derived.masterHeaders;
  const jobsIdx = derived.masterIdx;

  const derivedByKey = new Map();
  derived.rows.forEach(view => {
    if (view.unique_key) derivedByKey.set(view.unique_key, view);
  });

  const newRecommendedViews = selectJobsForNotification_(derived.rows, jobsIdx);

  const newRecommendedMasterRows = newRecommendedViews.map(view => view.masterRow);
  const newRecommendedRowsDedup = dedupeRowsForMail_(newRecommendedMasterRows, jobsIdx);


  //sort jobs

  newRecommendedRowsDedup.sort((a, b) => {
    const keyA = jobsIdx.unique_key != null ? String(a[jobsIdx.unique_key] || '') : '';
    const keyB = jobsIdx.unique_key != null ? String(b[jobsIdx.unique_key] || '') : '';

    const viewA = derivedByKey.get(keyA);
    const viewB = derivedByKey.get(keyB);

    const scoreA = viewA ? Number(viewA.final_score || 0) : 0;
    const scoreB = viewB ? Number(viewB.final_score || 0) : 0;

    if (scoreB !== scoreA) return scoreB - scoreA;

    const deadlineA = jobsIdx.deadline != null && a[jobsIdx.deadline]
      ? new Date(a[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    const deadlineB = jobsIdx.deadline != null && b[jobsIdx.deadline]
      ? new Date(b[jobsIdx.deadline]).getTime()
      : Number.MAX_SAFE_INTEGER;

    return deadlineA - deadlineB;
  });

  const newIgnoredViews = (CONFIG.debugMail && CONFIG.debugMail.includeIgnoredJobs)
    ? derived.rows.filter(view => {
        const notifiedAt = jobsIdx.notified_at != null
          ? view.masterRow[jobsIdx.notified_at]
          : '';

        return (
          view.final_category === 'Ignorieren' &&
          !notifiedAt &&
          view.visibility_preference !== 'hidden' &&
          view.job_state !== 'closed'
        );
      })
    : [];

  const newIgnoredRows = newIgnoredViews.map(view => view.masterRow);

  if (!newRecommendedRowsDedup.length && !newIgnoredRows.length) return;

  const relevant = [];
  const maybe = [];

  newRecommendedRowsDedup.forEach(row => {
    const uniqueKey = jobsIdx.unique_key != null ? String(row[jobsIdx.unique_key] || '') : '';
    const view = derivedByKey.get(uniqueKey);

    const metaParts = [];

    if (jobsIdx.percent_or_workload != null && row[jobsIdx.percent_or_workload]) {
      metaParts.push(row[jobsIdx.percent_or_workload]);
    }
    if (jobsIdx.grade != null && row[jobsIdx.grade]) {
      metaParts.push(row[jobsIdx.grade]);
    }
    if (jobsIdx.employer != null && row[jobsIdx.employer]) {
      metaParts.push(row[jobsIdx.employer]);
    }
    if (jobsIdx.source != null && row[jobsIdx.source]) {
      metaParts.push(row[jobsIdx.source]);
    }
    if (jobsIdx.location != null && row[jobsIdx.location]) {
      metaParts.push(row[jobsIdx.location]);
    }
    if (jobsIdx.domain != null && row[jobsIdx.domain]) {
      metaParts.push(`Domain: ${row[jobsIdx.domain]}`);
    }
    if (jobsIdx.dg != null && row[jobsIdx.dg]) {
      metaParts.push(`DG: ${row[jobsIdx.dg]}`);
    }
    if (jobsIdx.deadline != null && row[jobsIdx.deadline]) {
      metaParts.push(`Deadline: ${formatDateForMail_(row[jobsIdx.deadline])}`);
    }

    const finalScore = view ? view.final_score : '';
    const finalCategory = view ? view.final_category : '';

    const line = [
      `• ${jobsIdx.title != null ? (row[jobsIdx.title] || 'Ohne Titel') : 'Ohne Titel'}`,
      `  ${metaParts.join(' | ')}`,
      `  Score: ${finalScore}`,
      `  ${jobsIdx.url != null ? (row[jobsIdx.url] || '') : ''}`,
    ].join('\n');

    if (finalCategory === 'Relevant') relevant.push(line);
    if (finalCategory === 'Vielleicht') maybe.push(line);
  });

  const sheetUrl = ss.getUrl() + '#gid=' + jobsSheet.getSheetId();

  let body = 'Neue gefilterte Job-Übersicht\n\n';
  body += buildScanSummarySinceLastMail_(runId);
  body += 'Übersicht im Sheet:\n' + sheetUrl + '\n\n';

  if (relevant.length) {
    body += 'RELEVANT\n\n' + relevant.join('\n\n') + '\n\n';
  }

  if (maybe.length) {
    body += 'VIELLEICHT\n\n' + maybe.join('\n\n') + '\n\n';
  }

  body += '---\nAutomatisch generiert.\n\n\n';

  const pdfBlob = newRecommendedRowsDedup.length
    ? buildJobsPdfBlobFromRows_(newRecommendedRowsDedup, jobsHeaders, 30)
    : null;

  const mailOptions = {};
  if (pdfBlob) {
    mailOptions.attachments = [pdfBlob];
  }

  const ignoredDebugSection = buildIgnoredJobsDebugSectionFromRows_(newIgnoredRows, jobsHeaders);
  if (ignoredDebugSection) {
    body += ignoredDebugSection + '\n';
  }

  GmailApp.sendEmail(
    CONFIG.notification.recipient,
    `${CONFIG.notification.subjectPrefix} ${newRecommendedRowsDedup.length} neue Jobs`,
    body,
    mailOptions
  );

  const now = new Date();
  const allSentRows = newRecommendedRowsDedup.concat(newIgnoredRows);

  try {
    if (notifiedSheet && newRecommendedRowsDedup.length) {
      appendNotifiedRows_(notifiedSheet, newRecommendedRowsDedup, jobsIdx, now);
    } else {
      Logger.log('appendNotifiedRows_ skipped: notifiedSheet=' + !!notifiedSheet + ', rows=' + newRecommendedRowsDedup.length);
    }
  } catch (e) {
    Logger.log('appendNotifiedRows_ failed: ' + e);
  }

  try {
    if (allSentRows.length) {
      stampNotifiedAtInJobsAll_(jobsSheet, allSentRows, jobsIdx, now);
    } else {
      Logger.log('stampNotifiedAtInJobsAll_ skipped: no rows');
    }
  } catch (e) {
    Logger.log('stampNotifiedAtInJobsAll_ failed: ' + e);
  }
}


function selectJobsForNotification_(derivedRows, jobsIdx) {
  return derivedRows.filter(view => {
    const notifiedAt = jobsIdx.notified_at != null
      ? view.masterRow[jobsIdx.notified_at]
      : '';

    return (
      (view.final_category === 'Relevant' || view.final_category === 'Vielleicht') &&
      !notifiedAt &&
      view.visibility_preference !== 'hidden' &&
      view.job_state !== 'closed'
    );
  });
}




function formatJobsAllSheet_(sheet) {

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h || '').trim());

  const idx = indexMap_(headers);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastCol < 1) return;

  // --- Column widths ---
  const widths = {
    new_flag: 34,
    quick_flag: 26,

    title: 297,
    employer: 212,
    location: 104,
    source: 62,
    mail_date: 67,
    deadline: 59,
    score: 41,
    score_normalized: 54,
    category: 90,
    final_score: 54,
    final_category: 90,

    percent_or_workload: 58,
    grade: 61,
    domain: 45,
    dg: 63,
    first_seen_at: 67,
    last_seen_at: 70,
    notified_at: 53,

    application_status: 123,
    status: 72,
    manual_category_override: 118,
    manual_score_delta: 70,
    learn_from_feedback: 95,
    notes: 160,
    feedback_learned_at: 110,
    feedback_learning_version: 110,

    positive_hits: 57,
    negative_hits: 65,

    url: 90,
    unique_key: 61,
    hard_reject_hit: 238,
    source_label: 90,
    gmail_message_id: 148,
    gmail_thread_id: 114,
    raw_snippet: 247,
    detail_text: 247,
    raw_source_id: 247,
    run_id: 247
  };

  Object.keys(widths).forEach(name => {
    if (idx[name] != null) {
      sheet.setColumnWidth(idx[name] + 1, widths[name]);
    }
  });

  if (lastRow <= 1) return;

  const setFormat = (name, format) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setNumberFormat(format);
  };

  const setAlign = (name, align) => {
    if (idx[name] == null) return;
    sheet.getRange(2, idx[name] + 1, lastRow - 1, 1).setHorizontalAlignment(align);
  };

  // --- Date formats (short) ---
  setFormat('mail_date', 'd.M.');
  setFormat('deadline', 'd.M.');
  setFormat('first_seen_at', 'd.M.');
  setFormat('last_seen_at', 'd.M.');
  setFormat('notified_at', 'd.M.');
  setFormat('feedback_learned_at', 'd.M.');

  // --- Numeric formats ---
  setFormat('score', '0');
  setFormat('score_normalized', '0.0');
  setFormat('final_score', '0.0');
  setFormat('manual_score_delta', '0.0;-0.0;');

  // --- Alignment ---
  [
    'mail_date',
    'deadline',
    'first_seen_at',
    'last_seen_at',
    'notified_at',
    'feedback_learned_at'
  ].forEach(c => setAlign(c, 'right'));

  [
    'score',
    'score_normalized',
    'final_score',
    'manual_score_delta'
  ].forEach(c => setAlign(c, 'right'));

  //Format new_flag column
  if (idx.new_flag != null && lastRow > 1) {
    const range = sheet.getRange(2, idx.new_flag + 1, lastRow - 1, 1);
    range.setFontColor('#cc0000');
    range.setFontWeight('bold');
    range.setFontSize(8);
    range.setHorizontalAlignment('center');
  }
}





function formatAllSheets() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const jobsAll = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (jobsAll) {
    formatJobsAllSheet_(jobsAll);
    formatSheetByCategory_(jobsAll);
  }


}

function rebuildConditionalFormatting_(sheet) {

  const range = sheet.getRange("B2:B2000");

  const rules = [];

  // Regel 1: Zelle = "x" → grau + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("x")
      .setBackground("#888888")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  // Regel 2: Zelle nicht leer UND nicht "x" → dunkelrot + weiße Schrift
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($B2<>"",$B2<>"x")')
      .setBackground("#8b0000")
      .setFontColor("#ffffff")
      .setRanges([range])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}


//new function to replace formatAllSheets(),
//minimal, formats mainly date formats 
function formatJobsAllScoreColumns_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Jobs_All');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return;

  const headers = data[0];
  const scoreCol = headers.indexOf('score') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const bodyRows = Math.max(sheet.getLastRow() - 1, 0);

  if (bodyRows < 1) return;

  if (scoreCol > 0) {
    sheet.getRange(2, scoreCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }
}



function formatSheetByCategory_(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  const range = sheet.getDataRange();
  range.setVerticalAlignment('top');

  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);

  const sheetName = sheet.getName();
  //const frozenCols =
  //  sheetName === CONFIG.sheets.jobsAll ? 7 :
  //  sheetName === CONFIG.sheets.relevantAll ? 3 : //set to zero for no column freeze
  //  0;
  //sheet.setFrozenColumns(Math.min(frozenCols, lastCol));
  //sheet.autoResizeColumns(1, lastCol);

  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = indexMap_(headers);
  const categoryCol = idx.final_category != null ? idx.final_category : idx.category;
  const categories = sheet.getRange(2, categoryCol + 1, lastRow - 1, 1).getValues();

  const backgrounds = categories.map(row => {
    const cat = row[0];

    const color =
      cat === 'Relevant' ? '#e6f4ea' :
      cat === 'Vielleicht' ? '#fff8e1' :
      cat === 'Ignorieren' ? '#fce8e6' :
      '#ffffff';

    return new Array(lastCol).fill(color);
  });

  sheet.getRange(2, 1, backgrounds.length, lastCol).setBackgrounds(backgrounds);


  // QUICK FLAG formatting
  if (idx.quick_flag != null && lastRow > 1) {

    const qRange = sheet.getRange(2, idx.quick_flag + 1, lastRow - 1, 1);
    const values = qRange.getValues();

    const backgrounds = values.map(r => {
      return [String(r[0]).trim() ? '#dbeafe' : '#ffffff'];
    });

    qRange.setBackgrounds(backgrounds);
    qRange.setFontWeight('bold');
    qRange.setHorizontalAlignment('center');
  }

  rebuildConditionalFormatting_(sheet);

}



function zzz_ADMIN_resetNotifiedAll() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  resetNotifiedAll_();
}

function resetNotifiedAll_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.notifiedAll);
  if (!sheet) return;
  sheet.clearContents();
  sheet.getRange(1, 1, 1, NOTIFIED_COLUMNS.length).setValues([NOTIFIED_COLUMNS]);
}


function zzz_ADMIN_hardResetAllJobData() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Diese Funktion löscht oder ersetzt grosse Teile der Jobdaten. Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  hardResetAllJobData_();
}


function hardResetAllJobData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const specs = [
  { name: CONFIG.sheets.jobsAll, headers: JOBS_ALL_COLUMNS },
  { name: CONFIG.sheets.notifiedAll, headers: NOTIFIED_COLUMNS },
  ];
  
  specs.forEach(spec => {
    const sheet = ss.getSheetByName(spec.name);
    if (!sheet) return;
    sheet.clearContents();
    sheet.clearFormats();
    sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
  });
  
  LEARNING_CACHE = null;
}





function zzz_ADMIN_purgeOldLowValueJobs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Diese Funktion entfernt Jobs dauerhaft aus der aktiven Liste. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  purgeOldLowValueJobs_();
}


function listProjectFunctions() {

  const files = DriveApp.getFileById(ScriptApp.getScriptId())
    .getParents()
    .next()
    .getFilesByType(MimeType.GOOGLE_APPS_SCRIPT);

  let functions = [];

  while (files.hasNext()) {
    const file = files.next();
    const content = file.getBlob().getDataAsString();

    const matches = content.match(/function\s+([a-zA-Z0-9_]+)/g);

    if (matches) {
      matches.forEach(m => {
        const name = m.replace('function ', '').trim();
        functions.push(name);
      });
    }
  }

  functions = [...new Set(functions)].sort();

  functions.forEach(f => Logger.log(f));
}



function purgeOldLowValueJobs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol <= 0) return;

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const rows = data.slice(1).filter(row => {
    const uniqueKey = idx.unique_key != null ? String(row[idx.unique_key] || '').trim() : '';
    const title = idx.title != null ? String(row[idx.title] || '').trim() : '';
    const url = idx.url != null ? String(row[idx.url] || '').trim() : '';
    const source = idx.source != null ? String(row[idx.source] || '').trim() : '';
    return !!(uniqueKey || title || url || source);
  });

  const keptRows = rows.filter(row => {
    const category = String(row[idx.category] || '');
    const mailDate = row[idx.mail_date] instanceof Date ? row[idx.mail_date] : new Date(row[idx.mail_date]);
    const isOld = mailDate < daysAgo_(CONFIG.recency.staleIrrelevantDays);

    if (category === 'Relevant') return true;
    if (category === 'Vielleicht' && !isOld) return true;
    if (category === 'Ignorieren' && !isOld) return true;

    return false;
  });

  keptRows.forEach(row => {
    if (idx.new_flag != null) row[idx.new_flag] = '';
  });

  rewriteSheet_(sheet, [headers].concat(keptRows));
  ensureNewFlagFormulaJobsAll_();
  //buildRelevantViewAll();
  formatAllSheets();
}


function zzz_ADMIN_rebuildScoresFromManualFeedback() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Gefährlicher Lauf',
    'Diese Funktion bewertet alle Jobs neu und überschreibt berechnete Felder in Jobs_All. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  rebuildScoresFromManualFeedback_();
}



function rebuildScoresFromManualFeedback_() {
  Logger.log('Running rebuildScoresFromManualFeedback on ' + new Date());
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  refreshLearningCache_();

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  if (headers.length !== JOBS_ALL_COLUMNS.length) {
    throw new Error(
      `Header length mismatch: sheet has ${headers.length} columns, ` +
      `JOBS_ALL_COLUMNS has ${JOBS_ALL_COLUMNS.length}. Aborting rebuild.`
    );
  }

  for (let i = 0; i < JOBS_ALL_COLUMNS.length; i++) {
    if (headers[i] !== JOBS_ALL_COLUMNS[i]) {
      throw new Error(
        `Header mismatch at column ${i + 1}: sheet='${headers[i]}', expected='${JOBS_ALL_COLUMNS[i]}'.`
      );
    }
  }


  const updatedRows = rows.map(row => {
    const job = {
      source: row[idx.source],
      source_label: row[idx.source_label],
      mail_date: row[idx.mail_date],
      deadline: row[idx.deadline],
      first_seen_at: row[idx.first_seen_at],
      last_seen_at: row[idx.last_seen_at],
      gmail_message_id: row[idx.gmail_message_id],
      gmail_thread_id: row[idx.gmail_thread_id],
      title: row[idx.title],
      location: row[idx.location],
      employer: row[idx.employer],
      percent_or_workload: row[idx.percent_or_workload],
      grade: row[idx.grade],
      domain: row[idx.domain],
      dg: row[idx.dg],
      url: row[idx.url],
      raw_snippet: row[idx.raw_snippet],
      detail_text: row[idx.detail_text],
      raw_source_id: row[idx.raw_source_id],
    };

    const rescored = normalizeJobRecord_(job);

    [
      'quick_flag',
      'first_seen_at',
      'unique_key',
      'notified_at',
      'application_status',
      'status',
      'manual_category_override',
      'manual_score_delta',
      'learn_from_feedback',
      'notes',
      'feedback_learned_at',
      'feedback_learning_version',
      'archived_at',
      'archive_reason',
      'archive_batch_id',
      'archived_by'
    ].forEach(col => {
      if (idx[col] != null) rescored[idx[col]] = row[idx[col]];
    });

    if (idx.new_flag != null) {
      rescored[idx.new_flag] = '';
    }

    rescored[idx.last_seen_at] = new Date();

    return rescored;
  });

  if (!updatedRows.length) return;

  const expectedLen = JOBS_ALL_COLUMNS.length;

  const badRowIndex = updatedRows.findIndex(
    r => !Array.isArray(r) || r.length !== expectedLen
  );

  if (badRowIndex !== -1) {
    throw new Error(
      `Row ${badRowIndex + 2} has length ${updatedRows[badRowIndex]?.length}, expected ${expectedLen}. Aborting rebuild.`
    );
  }

  sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
  ensureNewFlagFormulaJobsAll_();
  //buildRelevantViewAll();
  formatAllSheets();
}




function formatCompactDate_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

function compactHitsForPdf_(hits, maxItems) {
  const limit = maxItems || 5;
  return String(hits || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}



function buildJobsPdfBlobFromRows_(rows, headers, maxJobs) {
  const limit = maxJobs || 30;
  const idx = indexMap_(headers);
  const selectedRows = rows.slice(0, limit);

  const doc = DocumentApp.create('Neue Jobs Report');
  const body = doc.getBody();

  body.clear();

  body.appendParagraph('Neue Jobs')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingAfter(4);

  body.appendParagraph(
    'Stand: ' + formatCompactDate_(new Date()) +
    ' · Neue Jobs: ' + selectedRows.length
  ).setFontSize(9).setForegroundColor('#666666');

  selectedRows.forEach((row, i) => {
    const title = String(row[idx.title] || '').trim();
    const employer = String(row[idx.employer] || '').trim();
    const location = String(row[idx.location] || '').trim();
    const workload = String(row[idx.percent_or_workload] || '').trim();
    const score = String(row[idx.score] || '').trim();
    const source = String(row[idx.source] || '').trim();
    const deadline = formatCompactDate_(row[idx.deadline]);
    const hits = compactHitsForPdf_(row[idx.positive_hits], 5);
    const url = String(row[idx.url] || '').trim();

    const metaParts = [];
    if (employer) metaParts.push(employer);
    if (location) metaParts.push(location);
    if (workload) metaParts.push(workload);
    if (score) metaParts.push('Score ' + score);
    if (source) metaParts.push(source);
    if (deadline) metaParts.push('Deadline ' + deadline);

    body.appendParagraph(title || '(Ohne Titel)')
      .setBold(true)
      .setFontSize(11);

    body.appendParagraph(metaParts.join(' · '))
      .setFontSize(9)
      .setForegroundColor('#444444');

    if (hits) {
      body.appendParagraph(hits)
        .setFontSize(8)
        .setForegroundColor('#666666');
    }

    if (url) {
      body.appendParagraph(url)
        .setFontSize(8)
        .setForegroundColor('#1155cc');
    }

    if (i < selectedRows.length - 1) {
      body.appendHorizontalRule();
    }
  });

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF).setName(
    'Neue-Jobs-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf'
  );

  file.setTrashed(true);
  return pdfBlob;
}


// *****************************************
// 2A. NEUE FUNKTIONEN 17.3.2026, NEUE DATENSTRUKTUR
// *****************************************

function onEdit(e) {
  try {
    handleEditableCockpitEdit_(e);
  } catch (err) {
    console.error('onEdit error', err);
  }
}

function handleEditableCockpitEdit_(e) {
  const range = e && e.range;
  if (!range) return;

  const sheet = range.getSheet();
  if (!sheet) return;

  const sheetName = sheet.getName();
  const allowedSheets = ['Jobs_Cockpit', 'Scoring_Cockpit'];
  if (!allowedSheets.includes(sheetName)) return;

  const row = range.getRow();
  const col = range.getColumn();

  if (row < 2) return;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const field = headers[col - 1];

  const editableFields = [
    'quick_flag',
    'application_status',
    'visibility_preference',
    'job_state',
    'notes',
    'manual_category',
    'manual_score_delta',
    'learn_from_feedback',
  ];

  if (!editableFields.includes(field)) return;

  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  if (uniqueKeyCol < 1) return;

  const uniqueKey = sheet.getRange(row, uniqueKeyCol).getValue();
  if (!uniqueKey) return;

  const newValue = sheet.getRange(row, col).getValue();

  upsertUserField_(uniqueKey, field, newValue);
}


function upsertUserField_(uniqueKey, field, value) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Jobs_User');
  if (!sheet) throw new Error('Sheet "Jobs_User" not found.');

  const data = sheet.getDataRange().getValues();
  if (!data || !data.length) throw new Error('Jobs_User is empty.');

  const headers = data[0];

  const keyIdx = headers.indexOf('unique_key');
  const fieldIdx = headers.indexOf(field);
  const updatedAtIdx = headers.indexOf('updated_at');
  const createdAtIdx = headers.indexOf('created_at');

  if (keyIdx === -1) throw new Error('Jobs_User missing column "unique_key".');
  if (fieldIdx === -1) throw new Error('Jobs_User missing column "' + field + '".');
  if (updatedAtIdx === -1) throw new Error('Jobs_User missing column "updated_at".');
  if (createdAtIdx === -1) throw new Error('Jobs_User missing column "created_at".');

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === uniqueKey) {
      rowIndex = i + 1;
      break;
    }
  }

  const now = new Date();

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, fieldIdx + 1).setValue(value);
    sheet.getRange(rowIndex, updatedAtIdx + 1).setValue(now);
  } else {
    const newRow = new Array(headers.length).fill('');
    newRow[keyIdx] = uniqueKey;
    newRow[fieldIdx] = value;
    newRow[createdAtIdx] = now;
    newRow[updatedAtIdx] = now;
    sheet.appendRow(newRow);
  }
}



function categoryFromNormalizedScore_(score) {
  if (score === '' || score === null || isNaN(score)) return '';

  if (score >= 10) return 'Relevant';
  if (score >= 0) return 'Vielleicht';
  return 'Ignorieren';
}



// *****************************************
// JOBS_COCKPIT
// *****************************************
function buildJobsCockpit() {
  buildJobsCockpit_()
}

function buildJobsCockpit_() {
  Logger.log('buildJobsCockpit_ START');

  const ss = SpreadsheetApp.getActive();
  const cockpitSheet = ss.getSheetByName('Jobs_Cockpit');

  const derived = buildDerivedJobViews_();

  const masterIdx = derived.masterIdx;

  const cockpitHeaders = [
    'new_flag',
    'quick_flag',
    'source',
    'location',
    'job_state',

    'title',
    'employer',
    'job_age',
    'deadline',
    'days_to_deadline',
    'url',

    'score_normalized',
    'final_score',
    'category',
    'final_category',

    'application_status',
    'visibility_preference',
    'manual_category',
    'manual_score_delta',
    'learn_from_feedback',
    'notes',

    'visibility_rank',
    'work_rank',
    'job_state_rank',
    'category_rank',
    'unique_key'
  ];

  const output = [cockpitHeaders];

  derived.rows.forEach(view => {
    const row = view.masterRow;

    const source = masterIdx.source != null ? (row[masterIdx.source] || '') : '';
    const location = masterIdx.location != null ? (row[masterIdx.location] || '') : '';
    const title = masterIdx.title != null ? (row[masterIdx.title] || '') : '';
    const employer = masterIdx.employer != null ? (row[masterIdx.employer] || '') : '';
    const deadline = masterIdx.deadline != null ? row[masterIdx.deadline] : '';
    const url = masterIdx.url != null ? (row[masterIdx.url] || '') : '';

    output.push([
      '',
      view.quick_flag,
      source,
      location,
      view.job_state,

      title,
      employer,
      view.job_age,
      deadline,
      view.days_to_deadline,
      url,

      view.score_normalized,
      view.final_score,
      view.category,
      view.final_category,

      view.application_status,
      view.visibility_preference,
      view.manual_category,
      view.manual_score_delta,
      view.learn_from_feedback,
      view.notes,

      view.visibility_rank,
      view.work_rank,
      view.job_state_rank,
      view.category_rank,
      view.unique_key
    ]);
  });

  cockpitSheet.clearContents();
  cockpitSheet.getRange(1, 1, output.length, output[0].length).setValues(output);

  applyNewFlagFormulas_(cockpitSheet);
  sortJobsCockpit_(cockpitSheet);
  formatJobsCockpit_(cockpitSheet);

  Logger.log('buildJobsCockpit_ DONE');
}


function computeDerivedStatus_(statusOverride, applicationStatus, manualRating, deadline) {
  if (statusOverride) return statusOverride;

  const app = (applicationStatus || '').toLowerCase();

  // Bewerbungsstatus
  if (app === 'applied' || app === 'beworben') return 'applied';
  if (app === 'interview') return 'open';
  if (app === 'offer') return 'open';

  if (app === 'rejection' || app === 'absage') return 'rejected';
  if (app === 'done' || app === 'erledigt') return 'closed';

  // Deadline abgelaufen
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate) && deadlineDate < today) {
      return 'closed';
    }
  }

  // manuelle Ablehnung
  if (manualRating === 'low' || manualRating === 'reject') {
    return 'rejected';
  }

  return 'open';
}

//für sortierung
function computeWorkRank_(visibilityPreference, applicationStatus, jobState) {
  const vis = String(visibilityPreference || '').trim().toLowerCase();
  const app = String(applicationStatus || '').trim().toLowerCase();
  const state = String(jobState || '').trim().toLowerCase();

  // 🔴 Bucket 3 – ganz nach unten (User will ihn nicht sehen)
  if (vis === 'hidden') {
    return 3;
  }

  // 🟠 Bucket 2 – closed oder bereits bearbeitet (Bewerbung läuft / abgeschlossen)
  if (state === 'closed') {
    return 2;
  }

  if (app && app !== 'none') {
    return 2;
  }

  // 🟢 Bucket 1 – aktiver Fokus
  return 1;
}

function computeCategoryRank_(category) {
  switch (String(category || '').trim()) {
    case 'Relevant': return 1;
    case 'Vielleicht': return 2;
    case 'Ignorieren': return 3;
    default: return 4;
  }
}

function computeVisibilityRank_(visibilityPreference) {
  switch (String(visibilityPreference || '').trim().toLowerCase()) {
    case 'hidden': return 2;
    case 'active':
    case '':
      return 1;
    default:
      return 1;
  }
}


function computeJobState_(deadline) {
  if (!deadline) return 'open';

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'open';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d < today ? 'closed' : 'open';
}

function computeJobStateRank_(jobState) {
  switch (String(jobState || '').trim().toLowerCase()) {
    case 'closed': return 2;
    case 'open':
    case '':
      return 1;
    default:
      return 1;
  }
}







//sortierung cockpit
function sortJobsCockpit_(sheet) {
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];

const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
const workRankCol = headers.indexOf('work_rank') + 1;
const jobStateRankCol = headers.indexOf('job_state_rank') + 1;
const categoryRankCol = headers.indexOf('category_rank') + 1;
const scoreCol = headers.indexOf('final_score') + 1;
const daysCol = headers.indexOf('days_to_deadline') + 1;

  if (range.getNumRows() <= 1) return;

  const sortSpecs = [];

  if (visibilityRankCol > 0) {
    sortSpecs.push({ column: visibilityRankCol, ascending: true });
  }

  if (workRankCol > 0) {
    sortSpecs.push({ column: workRankCol, ascending: true });
  }


  if (jobStateRankCol > 0) {
    sortSpecs.push({ column: jobStateRankCol, ascending: true });
  }

  if (categoryRankCol > 0) {
    sortSpecs.push({ column: categoryRankCol, ascending: true });
  }

  if (scoreCol > 0) {
    sortSpecs.push({ column: scoreCol, ascending: false });
  }

  if (daysCol > 0) {
    sortSpecs.push({ column: daysCol, ascending: true });
  }

  range.offset(1, 0, range.getNumRows() - 1).sort(sortSpecs);
}



//derived functions for both cockpit and mail

//loads data and indices
function loadJobsAllAndUserContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const masterSheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const userSheet = ss.getSheetByName(CONFIG.sheets.jobsUser);

  if (!masterSheet) throw new Error('Jobs_All fehlt.');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0] || [];
  const masterRows = masterData.slice(1);
  const masterIdx = indexMap_(masterHeaders);

  const userData = userSheet ? userSheet.getDataRange().getValues() : [];
  const userHeaders = userData.length ? userData[0] : [];
  const userRows = userData.length ? userData.slice(1) : [];
  const userIdx = indexMap_(userHeaders);

  const userMap = new Map();
  userRows.forEach(row => {
    const key = String(row[userIdx.unique_key] || '');
    if (key) userMap.set(key, row);
  });

  return {
    ss,
    masterSheet,
    userSheet,
    masterHeaders,
    masterRows,
    masterIdx,
    userHeaders,
    userRows,
    userIdx,
    userMap
  };
}


//translate master-row plus optional user-row into final view
function buildDerivedJobViewRow_(masterRow, ctx) {
  const { masterIdx, userIdx, userMap } = ctx;

  const uniqueKey = String(masterRow[masterIdx.unique_key] || '');
  const userRow = userMap.get(uniqueKey) || [];

  // --- MASTER ---
  const rawScoreNormalized = masterIdx.score_normalized != null
    ? masterRow[masterIdx.score_normalized]
    : '';

  let scoreNormalized = 0;
  if (rawScoreNormalized instanceof Date) {
    const sheetEpoch = new Date(Date.UTC(1899, 11, 30));
    scoreNormalized = (rawScoreNormalized.getTime() - sheetEpoch.getTime()) / (1000 * 60 * 60 * 24);
  } else if (rawScoreNormalized !== '' && rawScoreNormalized !== null) {
    scoreNormalized = Number(rawScoreNormalized);
  }

  const category = masterIdx.category != null
    ? (masterRow[masterIdx.category] || '')
    : '';

  const mailDate = masterIdx.mail_date != null
    ? masterRow[masterIdx.mail_date]
    : '';

  const firstSeen = masterIdx.first_seen_at != null
    ? masterRow[masterIdx.first_seen_at]
    : '';

  const deadline = masterIdx.deadline != null
    ? masterRow[masterIdx.deadline]
    : '';

  // --- USER ---
  const manualScoreDelta = userIdx.manual_score_delta != null
    ? Number(userRow[userIdx.manual_score_delta] || 0)
    : 0;

  const manualCategory = userIdx.manual_category != null
    ? String(userRow[userIdx.manual_category] || '').trim()
    : '';

  const applicationStatus = userIdx.application_status != null
    ? String(userRow[userIdx.application_status] || '').trim()
    : '';

  const visibilityPreference = userIdx.visibility_preference != null
    ? String(userRow[userIdx.visibility_preference] || '').trim().toLowerCase()
    : 'active';

  const userJobState = userIdx.job_state != null
    ? String(userRow[userIdx.job_state] || '').trim().toLowerCase()
    : '';

  const quickFlag = userIdx.quick_flag != null
    ? String(userRow[userIdx.quick_flag] || '').trim()
    : '';

  const notes = userIdx.notes != null
    ? String(userRow[userIdx.notes] || '')
    : '';

  const learnFromFeedback = userIdx.learn_from_feedback != null
    ? String(userRow[userIdx.learn_from_feedback] || '').trim()
    : '';

  // --- DERIVED: SCORE / CATEGORY ---
  const finalScore = scoreNormalized + manualScoreDelta;
  const finalCategory = manualCategory || categoryFromNormalizedScore_(finalScore);

  // --- DERIVED: JOB STATE ---
  const inferredJobState = computeJobState_(deadline);
  const jobState = userJobState || inferredJobState;

  // --- DERIVED: JOB AGE ---
  const today = new Date();
  let baseDate = mailDate || firstSeen;
  let jobAge = '';

  if (baseDate) {
    const diff = today - new Date(baseDate);
    jobAge = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // --- DERIVED: DEADLINE ---
  let daysToDeadline = '';

  if (deadline) {
    const todayClean = new Date();
    todayClean.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (!isNaN(deadlineDate)) {
      const diff = deadlineDate - todayClean;
      daysToDeadline = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
  }

  // --- DERIVED: RANKS ---
  const visibilityRank = computeVisibilityRank_(visibilityPreference);
  const jobStateRank = computeJobStateRank_(jobState);
  const categoryRank = computeCategoryRank_(finalCategory);
  const workRank = computeWorkRank_(visibilityPreference, applicationStatus, jobState, finalCategory);

  return {
    unique_key: uniqueKey,

    masterRow,
    userRow,

    // master passthrough
    score_normalized: scoreNormalized,
    category: category,

    // derived core
    final_score: finalScore,
    final_category: finalCategory,

    // user fields
    manual_score_delta: manualScoreDelta,
    manual_category: manualCategory,
    application_status: applicationStatus,
    visibility_preference: visibilityPreference,
    job_state: jobState,
    quick_flag: quickFlag,
    notes: notes,
    learn_from_feedback: learnFromFeedback,

    // derived extras
    job_age: jobAge,
    days_to_deadline: daysToDeadline,

    // ranks
    visibility_rank: visibilityRank,
    job_state_rank: jobStateRank,
    category_rank: categoryRank,
    work_rank: workRank
  };
}





//loop over master rows
function buildDerivedJobViews_() {
  const ctx = loadJobsAllAndUserContext_();

  const rows = ctx.masterRows.map(masterRow => buildDerivedJobViewRow_(masterRow, ctx));

  return {
    ...ctx,
    rows
  };
}




function debugDerivedSampleDELME() {
  const derived = buildDerivedJobViews_();
  const sample = derived.rows.slice(0, 5);

  Logger.log('rows: ' + derived.rows.length);

  sample.forEach(v => {
    Logger.log(JSON.stringify({
      title: derived.masterIdx.title != null ? v.masterRow[derived.masterIdx.title] : '',
      final_score: v.final_score,
      final_category: v.final_category,
      job_state: v.job_state,
      visibility: v.visibility_preference,
      quick_flag: v.quick_flag
    }));
  });
}



function formatJobsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs_Cockpit');
  if (!sheet) throw new Error('Jobs_Cockpit sheet not found');
  formatJobsCockpit_(sheet);
}


function formatJobsCockpit_(sheet) {
  if (!sheet) {
    throw new Error('formatJobsCockpit_: sheet is undefined');
  }
  const range = sheet.getDataRange();
  const headers = range.getValues()[0];
  const numRows = range.getNumRows();
  const numCols = headers.length;

  const headerRow = 1;
  const bodyRows = Math.max(numRows - 1, 0);

  const newCol = headers.indexOf('new_flag') + 1;
  const quickFlagCol = headers.indexOf('quick_flag') + 1;
  const sourceCol = headers.indexOf('source') + 1;
  const locationCol = headers.indexOf('location') + 1;
  const titleCol = headers.indexOf('title') + 1;
  const employerCol = headers.indexOf('employer') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;
  const deadlineCol = headers.indexOf('deadline') + 1;
  const daysCol = headers.indexOf('days_to_deadline') + 1;
  const urlCol = headers.indexOf('url') + 1;
  const appStatusCol = headers.indexOf('application_status') + 1;
  const visibilityPrefCol = headers.indexOf('visibility_preference') + 1;
  const visibilityRankCol = headers.indexOf('visibility_rank') + 1;
  const manualCategoryCol = headers.indexOf('manual_category') + 1;
  const manualDeltaCol = headers.indexOf('manual_score_delta') + 1;
  const learnCol = headers.indexOf('learn_from_feedback') + 1;
  const notesCol = headers.indexOf('notes') + 1;
  const scoreNormCol = headers.indexOf('score_normalized') + 1;
  const finalScoreCol = headers.indexOf('final_score') + 1;
  const workRankCol = headers.indexOf('work_rank') + 1;
  const categoryRankCol = headers.indexOf('category_rank') + 1;
  const uniqueKeyCol = headers.indexOf('unique_key') + 1;
  const jobStateCol = headers.indexOf('job_state') + 1;
  const jobStateRankCol = headers.indexOf('job_state_rank') + 1;

  // --- Conditional rules sauber neu setzen ---
  sheet.clearConditionalFormatRules();

  // --- Freeze ---
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4); // new_flag, quick_flag, source, location

  // --- Header ---
  const headerRange = sheet.getRange(headerRow, 1, 1, numCols);
  headerRange
    .setFontWeight('bold')
    .setWrap(false);

  // --- Grundformat Body ---
  if (bodyRows > 0) {
    const bodyRange = sheet.getRange(2, 1, bodyRows, numCols);
    bodyRange
      .setFontColor('black')
      .setFontWeight('normal')
      .setFontSize(10)
      .setWrap(false)
      .setBackground(null);
  }


  // --- Editierbare Spalten leicht einfärben ---
  const editableCols = [
    quickFlagCol,
    jobStateCol,
    appStatusCol,
    visibilityPrefCol,
    manualCategoryCol,
    manualDeltaCol,
    learnCol,
    notesCol
  ].filter(c => c > 0);

  editableCols.forEach(col => {
    if (bodyRows > 0) {
      sheet.getRange(2, col, bodyRows, 1).setBackground('#eef4ff');
    }
  });


  // --- Zahl-/Datumsformate ---
  if (jobAgeCol > 0 && bodyRows > 0) {
    sheet.getRange(2, jobAgeCol, bodyRows, 1).setNumberFormat('0');
  }

  if (scoreNormCol > 0 && bodyRows > 0) {
    sheet.getRange(2, scoreNormCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (finalScoreCol > 0 && bodyRows > 0) {
    sheet.getRange(2, finalScoreCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (manualDeltaCol > 0 && bodyRows > 0) {
    sheet.getRange(2, manualDeltaCol, bodyRows, 1).setNumberFormat('0.0');
  }

  if (deadlineCol > 0 && bodyRows > 0) {
    sheet.getRange(2, deadlineCol, bodyRows, 1).setNumberFormat('dd.mm.yyyy');
  }

  if (daysCol > 0 && bodyRows > 0) {
    sheet.getRange(2, daysCol, bodyRows, 1).setNumberFormat('0');
  }

  // --- NEW-Spalte kleiner ---
  if (newCol > 0 && bodyRows > 0) {
    sheet.getRange(2, newCol, bodyRows, 1).setFontSize(9);
  }

  // --- Spaltenbreiten (pragmatisch) ---
  if (newCol > 0) sheet.setColumnWidth(newCol, 32);
  if (quickFlagCol > 0) sheet.setColumnWidth(quickFlagCol, 20);
  if (sourceCol > 0) sheet.setColumnWidth(sourceCol, 50);
  if (locationCol > 0) sheet.setColumnWidth(locationCol, 85);
  if (jobStateCol > 0) sheet.setColumnWidth(jobStateCol, 55);
  if (visibilityPrefCol > 0) sheet.setColumnWidth(visibilityPrefCol, 85);
  if (visibilityRankCol > 0) sheet.setColumnWidth(visibilityRankCol, 70);
  if (jobStateRankCol > 0) sheet.setColumnWidth(jobStateRankCol, 70);
  if (titleCol > 0) sheet.setColumnWidth(titleCol, 260);
  if (employerCol > 0) sheet.setColumnWidth(employerCol, 150);
  if (jobAgeCol > 0) sheet.setColumnWidth(jobAgeCol, 55);
  if (deadlineCol > 0) sheet.setColumnWidth(deadlineCol, 80);
  if (daysCol > 0) sheet.setColumnWidth(daysCol, 30);

  if (urlCol > 0) sheet.setColumnWidth(urlCol, 65);
  if (scoreNormCol > 0) sheet.setColumnWidth(scoreNormCol, 70);
  if (finalScoreCol > 0) sheet.setColumnWidth(finalScoreCol, 70);
  if (manualCategoryCol > 0) sheet.setColumnWidth(manualCategoryCol, 70);
  if (manualDeltaCol > 0) sheet.setColumnWidth(manualDeltaCol, 70);
  if (learnCol > 0) sheet.setColumnWidth(learnCol, 70);
  if (notesCol > 0) sheet.setColumnWidth(notesCol, 220);
  if (workRankCol > 0) sheet.setColumnWidth(workRankCol, 70);
  if (categoryRankCol > 0) sheet.setColumnWidth(categoryRankCol, 70);
  if (uniqueKeyCol > 0) sheet.setColumnWidth(uniqueKeyCol, 160);


  // --- Conditional formatting Regeln ---
  const rules = [];

  // NEW = rot + fett
  if (newCol > 0 && bodyRows > 0) {
    const newRange = sheet.getRange(2, newCol, bodyRows, 1);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('NEW')
        .setFontColor('#d93025')
        .setBold(true)
        .setRanges([newRange])
        .build()
    );
  }



  // Quick-Flag: A = rot, B = orange, ! = blau, X = grau
  if (quickFlagCol > 0 && bodyRows > 0) {
    const quickRange = sheet.getRange(2, quickFlagCol, bodyRows, 1);
    const qCol = columnToLetter_(quickFlagCol);

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="A"`)
        .setBackground('#8b0000')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="B"`)
        .setBackground('#f59e0b')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="!"`)
        .setBackground('#2563eb')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${qCol}2="X"`)
        .setBackground('#6b7280')
        .setFontColor('#ffffff')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );

    // Optional: alles andere Nicht-Leere leicht markieren
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($${qCol}2<>"",$${qCol}2<>"A",$${qCol}2<>"B",$${qCol}2<>"!",$${qCol}2<>"X")`)
        .setBackground('#dbeafe')
        .setFontColor('#111827')
        .setBold(true)
        .setRanges([quickRange])
        .build()
    );
  }

  // Ganze Zeile dimmen abhängig von job_state / application_status
  if (bodyRows > 0) {
    const fullBodyRange = sheet.getRange(2, 1, bodyRows, numCols);

    if (jobStateCol > 0) {
      const jobStateLetter = columnToLetter_(jobStateCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=$${jobStateLetter}2="closed"`)
          .setFontColor('#bbbbbb')
          .setRanges([fullBodyRange])
          .build()
      );
    }

    if (appStatusCol > 0) {
      const appStatusLetter = columnToLetter_(appStatusCol);

      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=AND($${appStatusLetter}2<>"",$${appStatusLetter}2<>"none")`)
          .setFontColor('#999999')
          .setRanges([fullBodyRange])
          .build()
      );
    }
  }

  if (visibilityPrefCol > 0 && bodyRows > 0) {
  const visRange = sheet.getRange(2, visibilityPrefCol, bodyRows, 1);
  const visLetter = columnToLetter_(visibilityPrefCol);

  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$${visLetter}2="hidden"`)
      .setBackground('#e5e7eb')
      .setFontColor('#374151')
      .setRanges([visRange])
      .build()
  );
}

  // days_to_deadline: bald fällig / überfällig
  if (daysCol > 0 && bodyRows > 0) {

    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThanOrEqualTo(3)
        .setBackground('#fdecea') // leicht rot
        .setRanges([sheet.getRange(2, daysCol, bodyRows, 1)])
        .build()
    );


  }

  sheet.setConditionalFormatRules(rules);
}



function applyNewFlagFormulas_(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const numRows = values.length;

  if (numRows < 2) return;

  const headers = values[0];

  const newCol = headers.indexOf('new_flag') + 1;
  const jobAgeCol = headers.indexOf('job_age') + 1;

  if (newCol < 1 || jobAgeCol < 1) return;

  const jobAgeLetter = columnToLetter_(jobAgeCol);

  // Settings!B2 enthält new_threshold_days
  const formulas = [];
  for (let r = 2; r <= numRows; r++) {
    formulas.push([
      `=IF(AND(${jobAgeLetter}${r}<>"",${jobAgeLetter}${r}<=Settings!$B$2),"NEW","")`
    ]);
  }

  sheet.getRange(2, newCol, numRows - 1, 1).setFormulas(formulas);
}


function columnToLetter_(column) {
  let temp = '';
  let letter = '';

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}


function getSettingValue_(key, defaultValue) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return defaultValue;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return defaultValue;

  const headers = data[0];
  const keyIdx = headers.indexOf('key');
  const valueIdx = headers.indexOf('value');

  if (keyIdx === -1 || valueIdx === -1) return defaultValue;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === key) {
      const value = data[i][valueIdx];
      return value === '' || value === null ? defaultValue : value;
    }
  }

  return defaultValue;
}

// *****************************************
// SOURCE HEALTH
// *****************************************

function buildSourceHealthView_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.sheets.scanLog);
  if (!logSheet) throw new Error('Scan_Log fehlt.');

  let healthSheet = ss.getSheetByName('Source_Health');
  if (!healthSheet) {
    healthSheet = ss.insertSheet('Source_Health');
  }

  const data = logSheet.getDataRange().getValues();

  const output = [[
    'source',
    'last_run_at',
    'status',
    'items_seen',
    'jobs_parsed',
    'new_jobs',
    'duration_s',
    'warning_flag',
    'message'
  ]];

  if (data.length <= 1) {
    healthSheet.clearContents();
    healthSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
    formatSourceHealthSheet_(healthSheet);
    return;
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const latestBySource = new Map();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const source = String(row[idx.source] || '').trim();
    const runAt = row[idx.run_at];

    if (!source || !runAt) continue;

    if (!latestBySource.has(source)) {
      latestBySource.set(source, row);
      continue;
    }

    const existing = latestBySource.get(source);
    const existingRunAt = existing[idx.run_at];

    if (new Date(runAt) > new Date(existingRunAt)) {
      latestBySource.set(source, row);
    }
  }

  Array.from(latestBySource.keys()).sort().forEach(source => {
    const row = latestBySource.get(source);

    const status = String(row[idx.status] || '');
    const itemsSeen = row[idx.items_seen] || 0;
    const jobsParsed = row[idx.jobs_parsed] || 0;
    const newJobs = row[idx.new_jobs] || 0;
    const durationMs = Number(row[idx.duration_ms] || 0);
    const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
    const message = row[idx.message] || '';

    const isSystem = source.startsWith('SYSTEM:');

    let warningFlag = '';
    if (status === 'error') {
      warningFlag = 'ERROR';
    } else if (!isSystem && Number(jobsParsed) === 0) {
      warningFlag = 'CHECK';
    }

    output.push([
      source,
      row[idx.run_at] || '',
      status,
      itemsSeen,
      jobsParsed,
      newJobs,
      durationSec,
      warningFlag,
      message
    ]);
  });

  healthSheet.clearContents();
  healthSheet.getRange(1, 1, output.length, output[0].length).setValues(output);

  formatSourceHealthSheet_(healthSheet);
}


function formatSourceHealthSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;

  sheet.setFrozenRows(1);

  const header = sheet.getRange(1, 1, 1, lastCol);
  header.setFontWeight('bold');

  sheet.getRange(1, 1, lastRow, lastCol).setVerticalAlignment('top');

  const widths = {
    1: 110, // source
    2: 140, // last_run_at
    3: 70,  // status
    4: 80,  // items_seen
    5: 80,  // jobs_parsed
    6: 80,  // new_jobs
    7: 80,  // duration_s
    8: 90,  // warning_flag
    9: 420  // message
  };

  Object.keys(widths).forEach(col => {
    sheet.setColumnWidth(Number(col), widths[col]);
  });

  if (lastRow > 1) {
    sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat('dd.mm.yyyy hh:mm');
    sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat('0');
  }

  sheet.clearConditionalFormatRules();

  if (lastRow > 1) {
    const fullRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const warningColLetter = columnToLetter_(8);

    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${warningColLetter}2="ERROR"`)
        .setBackground('#fce8e6')
        .setFontColor('#b3261e')
        .setRanges([fullRange])
        .build(),

      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$${warningColLetter}2="CHECK"`)
        .setBackground('#fff8e1')
        .setFontColor('#8a6d1d')
        .setRanges([fullRange])
        .build()
    ];

    sheet.setConditionalFormatRules(rules);
  }
}



// *****************************************
// SCORING COCKPIT
// *****************************************



function buildScoringCockpit() {
  buildScoringCockpit_();
}

function buildScoringCockpit_() {
  Logger.log('buildScoringCockpit_ START');

  const ss = SpreadsheetApp.getActive();

  const masterSheet = ss.getSheetByName('Jobs_All');
  if (!masterSheet) throw new Error('Sheet "Jobs_All" not found.');

  const userSheet = ss.getSheetByName('Jobs_User');
  if (!userSheet) throw new Error('Sheet "Jobs_User" not found.');

  let cockpitSheet = ss.getSheetByName('Scoring_Cockpit');
  if (!cockpitSheet) {
    cockpitSheet = ss.insertSheet('Scoring_Cockpit');
  }

  const masterData = masterSheet.getDataRange().getValues();
  const userData = userSheet.getDataRange().getValues();

  cockpitSheet.clearContents();
  cockpitSheet.clearFormats();

  if (!masterData || masterData.length === 0) {
    cockpitSheet.getRange(1, 1, 1, SCORING_COCKPIT_COLUMNS.length)
      .setValues([SCORING_COCKPIT_COLUMNS]);
    formatScoringCockpitSheet_(cockpitSheet, 1, SCORING_COCKPIT_COLUMNS.length);
    Logger.log('buildScoringCockpit_ END (empty master)');
    return;
  }

  const masterHeaders = masterData[0];
  const userHeaders = userData && userData.length ? userData[0] : [];

  const mIdx = indexMap_(masterHeaders);
  const uIdx = indexMap_(userHeaders);

  const userMap = {};
  const userKeyIdx = uIdx.unique_key;

  if (userKeyIdx !== -1 && userKeyIdx !== undefined) {
    for (let i = 1; i < userData.length; i++) {
      const row = userData[i];
      const key = row[userKeyIdx];
      if (key) userMap[key] = row;
    }
  }

  const out = [SCORING_COCKPIT_COLUMNS];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const uniqueKey = row[mIdx.unique_key] ?? '';
    const userRow = uniqueKey && userMap[uniqueKey] ? userMap[uniqueKey] : null;

    out.push([
      row[mIdx.source] ?? '',
      row[mIdx.location] ?? '',
      row[mIdx.title] ?? '',
      row[mIdx.employer] ?? '',

      userRow && uIdx.manual_category !== -1 ? (userRow[uIdx.manual_category] ?? '') : '',
      userRow && uIdx.manual_score_delta !== -1 ? (userRow[uIdx.manual_score_delta] ?? '') : '',
      userRow && uIdx.learn_from_feedback !== -1 ? (userRow[uIdx.learn_from_feedback] ?? '') : '',
      userRow && uIdx.notes !== -1 ? (userRow[uIdx.notes] ?? '') : '',

      row[mIdx.category] ?? '',
      row[mIdx.score] ?? '',
      row[mIdx.score_normalized] ?? '',
      row[mIdx.hard_reject_hit] ?? '',

      row[mIdx.deadline] ?? '',
      row[mIdx.mail_date] ?? '',
      row[mIdx.grade] ?? '',
      row[mIdx.percent_or_workload] ?? '',
      row[mIdx.domain] ?? '',
      row[mIdx.dg] ?? '',
      row[mIdx.source_label] ?? '',

      row[mIdx.positive] ?? '',
      row[mIdx.negative] ?? '',

      row[mIdx.url] ?? '',
      uniqueKey
    ]);
  }

  const categoryOrder = {
    'Relevant': 1,
    'Vielleicht': 2,
    'Ignorieren': 3
  };

const dataRows = out.slice(1);

const cIdx = indexMap_(SCORING_COCKPIT_COLUMNS);

dataRows.sort((a, b) => {
  const catA = categoryOrder[a[cIdx.category]] || 99;
  const catB = categoryOrder[b[cIdx.category]] || 99;
  if (catA !== catB) return catA - catB;

  const scoreA = Number(a[cIdx.score_normalized]) || 0;
  const scoreB = Number(b[cIdx.score_normalized]) || 0;
  return scoreB - scoreA;
});

  const finalOut = [out[0]].concat(dataRows);

  const expectedWidth = SCORING_COCKPIT_COLUMNS.length;
  finalOut.forEach((row, i) => {
    if (row.length !== expectedWidth) {
      throw new Error(
        'Scoring_Cockpit width mismatch in row ' + (i + 1) +
        ': expected ' + expectedWidth +
        ', got ' + row.length
      );
    }
  });

  const filter = cockpitSheet.getFilter();
  if (filter) filter.remove();

  cockpitSheet.getRange(1, 1, finalOut.length, expectedWidth).setValues(finalOut);
  cockpitSheet.setFrozenRows(1);

  formatScoringCockpitSheet_(cockpitSheet, finalOut.length, expectedWidth);

  Logger.log('buildScoringCockpit_ END');
}



function formatScoringCockpitSheet_(sheet, numRows, numCols) {
  if (numRows < 1 || numCols < 1) return;

  sheet.getRange(1, 1, 1, numCols).setFontWeight('bold');

  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, numRows, numCols).createFilter();


  const widths = {
    1: 90,   // source
    2: 160,  // location
    3: 420,  // title
    4: 220,  // employer

    5: 120,  // manual_category
    6: 120,  // manual_score_delta
    7: 140,  // learn_from_feedback
    8: 260,  // notes

    9: 110,  // category
    10: 70,  // score
    11: 110, // score_normalized
    12: 110, // hard_reject_hit

    13: 100, // deadline
    14: 100, // mail_date
    15: 100, // grade
    16: 120, // percent_or_workload
    17: 110, // domain
    18: 80,  // dg
    19: 120, // source_label

    20: 320, // positive
    21: 220, // negative

    22: 260, // url
    23: 220  // unique_key
  };

  Object.keys(widths).forEach(col => {
    sheet.setColumnWidth(Number(col), widths[col]);
  });

  const cIdx = indexMap_(SCORING_COCKPIT_COLUMNS);

  if (numRows > 1) {
    sheet.getRange(2, cIdx.score + 1, numRows - 1, 1).setNumberFormat('0.0');
    sheet.getRange(2, cIdx.score_normalized + 1, numRows - 1, 1).setNumberFormat('0.0');
    sheet.getRange(2, cIdx.manual_score_delta + 1, numRows - 1, 1).setNumberFormat('0.0');
  }

  paintEditableColumnsScoringCockpit_(sheet, numRows);
}

function paintEditableColumnsScoringCockpit_(sheet, numRows) {
  if (numRows < 2) return;

  const headerMap = indexMap_(SCORING_COCKPIT_COLUMNS);
  const editableColor = '#d9edf7'; // hellblau

  SCORING_COCKPIT_EDITABLE_COLUMNS.forEach(name => {
    const zeroBasedIdx = headerMap[name];
    if (zeroBasedIdx === -1 || zeroBasedIdx === undefined) return;

    const col = zeroBasedIdx + 1;
    sheet.getRange(2, col, numRows - 1, 1).setBackground(editableColor);
  });
}

// *****************************************
// 3. ORCHESTRIERUNG / SCHREIBEN / VIEWS
// *****************************************







function columnNumberToLetter_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}


function ensureNewFlagFormulaJobsAll() {
  ensureNewFlagFormulaJobsAll_() 
}

function ensureNewFlagFormulaJobsAll_() {

return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);

  if (!sheet || sheet.getLastRow() < 2) return;

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const idx = indexMap_(headers);

  if (idx.new_flag == null) {
    throw new Error('new_flag column not found.');
  }

  const col = idx.new_flag + 1;
  const a1 = columnNumberToLetter_(col) + '2';

  const lastRow = sheet.getLastRow();

  const formula =
    '=LET(' +
    'fs,INDEX($A$2:$ZZ$' + lastRow + ',,MATCH("first_seen_at",$A$1:$ZZ$1,0)),' +
    'days,new_days,' +
    'ARRAYFORMULA(IF(fs="","",IF(TODAY()-fs<=days,"NEW","")))' +
    ')';

  sheet.getRange(a1).setFormula(formula);
}




function formatNewFlagColumn_(sheet) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h || '').trim());

  const idx = indexMap_(headers);
  const lastRow = sheet.getLastRow();

  if (idx.new_flag == null || lastRow <= 1) return;

  const newRange = sheet.getRange(2, idx.new_flag + 1, lastRow - 1, 1);
  const values = newRange.getDisplayValues();

  const fontColors = [];
  const fontWeights = [];
  const fontSizes = [];

  values.forEach(r => {
    if (String(r[0]).trim() === 'NEW') {
      fontColors.push(['#cc0000']);
      fontWeights.push(['bold']);
      fontSizes.push([8]);
    } else {
      fontColors.push(['#000000']);
      fontWeights.push(['normal']);
      fontSizes.push([10]);
    }
  });

  newRange.setBackgrounds(Array(lastRow - 1).fill([null]));
  newRange.setFontColors(fontColors);
  newRange.setFontWeights(fontWeights);
  newRange.setFontSizes(fontSizes);
  newRange.setHorizontalAlignment('center');
}



function computeNewFlag_(row, idx) {

  const firstSeen = row[idx.first_seen_at] instanceof Date
    ? row[idx.first_seen_at]
    : new Date(row[idx.first_seen_at]);

  if (!(firstSeen instanceof Date) || isNaN(firstSeen.getTime())) return '';

  // TEMPORARY MODE
  const cutoff = daysAgo_(CONFIG.recency.temporaryNewFlagDays);
  return firstSeen >= cutoff ? 'NEW' : '';

  /*
  // NORMAL MODE (restore later)
  const notified = row[idx.notified_at];
  const cutoff = daysAgo_(CONFIG.recency.staleIrrelevantDays);

  if (!notified && firstSeen >= cutoff) {
    return 'NEW';
  }

  return '';
  */
}

function isHandledApplicationStatus_(value) {
  const s = String(value || '').trim().toLowerCase();
  return ['beworben', 'applied', 'interview', 'absage', 'offer', 'erledigt'].indexOf(s) !== -1;
}

function getHandledRank_(value) {
  return isHandledApplicationStatus_(value) ? 1 : 0;
}

function getCategoryRank_(value) {
  const s = normalizeCategoryLabel_(value);
  if (s === 'Relevant') return 0;
  if (s === 'Vielleicht') return 1;
  if (s === 'Ignorieren') return 2;
  return 9;
}

function getNewFlagRank_(value) {
  return String(value || '').trim().toUpperCase() === 'NEW' ? 1 : 0;
}



function computeAutoStatus_(row, idx) {

  const manualStatus = String(row[idx.status] || '').trim().toLowerCase();
  const appStatus = String(row[idx.application_status] || '').trim().toLowerCase();

  // manuelle Entscheidungen respektieren
  if (manualStatus === 'closed' || manualStatus === 'archived') {
    return manualStatus;
  }

  if (appStatus === 'beworben' || appStatus === 'applied') return 'applied';
  if (appStatus === 'interview') return 'interview';
  if (appStatus === 'offer') return 'offer';
  if (appStatus === 'absage' || appStatus === 'erledigt') return 'closed';

  const staleDays = CONFIG.recency.staleStatusDays;
  const cutoff = daysAgo_(staleDays);

  const lastSeen = row[idx.last_seen_at] instanceof Date
    ? row[idx.last_seen_at]
    : new Date(row[idx.last_seen_at]);

  if (lastSeen instanceof Date && !isNaN(lastSeen.getTime())) {
    if (lastSeen < cutoff) return 'stale';
  }

  return 'open';
}



function applyCockpitFieldsToRow_(row, idx) {
  //if (idx.final_score != null) {
//    row[idx.final_score] = computeFinalScore_(row, idx);
//  }

//  if (idx.final_category != null) {
//    row[idx.final_category] = computeFinalCategory_(row, idx);
//  }

  //if (idx.new_flag != null) {
  //  row[idx.new_flag] = computeNewFlag_(row, idx);
  //}

//  if (idx.status != null) {
//    row[idx.status] = computeAutoStatus_(row, idx);
//  }

  if (idx.status != null) {
    const appStatus = String(row[idx.application_status] || '').trim().toLowerCase();

    if (appStatus === 'beworben' || appStatus === 'applied') {
      row[idx.status] = 'applied';
    } else if (appStatus === 'interview') {
      row[idx.status] = 'interview';
    } else if (appStatus === 'absage') {
      row[idx.status] = 'closed';
    } else if (appStatus === 'offer') {
      row[idx.status] = 'offer';
    } else if (appStatus === 'erledigt') {
      row[idx.status] = 'archived';
    } else if (!row[idx.status]) {
      row[idx.status] = 'open';
    }
  }

  return row;
}


function getStatusRank_(status) {

  const s = String(status || '').toLowerCase();

  if (s === 'open') return 0;
  if (s === 'interview') return 1;
  if (s === 'offer') return 2;
  if (s === 'applied') return 3;
  if (s === 'closed') return 4;
  if (s === 'stale') return 5;
  if (s === 'archived') return 6;

  return 9;
}









function zzz_ADMIN_migrateCockpitSchemaV1() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ACHTUNG',
    'Fortfahren?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  migrateCockpitSchemaV1_();
}



function migrateCockpitSchemaV1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  migrateSheetAddMissingColumns_(ss.getSheetByName(CONFIG.sheets.jobsAll), JOBS_ALL_COLUMNS);
  //buildRelevantViewAll();
}

function migrateSheetAddMissingColumns_(sheet, expectedHeaders) {
  if (!sheet) throw new Error('Sheet fehlt für Migration.');

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(h => String(h || '').trim());

  while (actualHeaders.length && !actualHeaders[actualHeaders.length - 1]) {
    actualHeaders.pop();
  }

  const prefixMatches = actualHeaders.length <= expectedHeaders.length && actualHeaders.every((h, i) => h === expectedHeaders[i]);
  if (!prefixMatches) {
    throw new Error('Migration abgebrochen für Sheet "' + sheet.getName() + '": bestehende Header sind kein exakter Prefix des erwarteten Schemas.');
  }

  if (actualHeaders.length === expectedHeaders.length) return;

  const missing = expectedHeaders.slice(actualHeaders.length);
  sheet.getRange(1, actualHeaders.length + 1, 1, missing.length).setValues([missing]);
}

function normalizeJobRecord_(job) {
  const scoring = scoreJobBySource_(job);
  const uniqueKey = buildUniqueKey_(
    job.source,
    job.title,
    job.employer,
    job.location,
    job.url,
    job.raw_source_id
  );

  const rowObj = {
    unique_key: uniqueKey,
    source: job.source || '',
    source_label: job.source_label || '',
    raw_source_id: job.raw_source_id || '',
    url: job.url || '',

    title: job.title || '',
    employer: job.employer || '',
    location: job.location || '',
    mail_date: asDateOrBlank_(job.mail_date),
    deadline: asDateOrBlank_(job.deadline),
    percent_or_workload: job.percent_or_workload || '',
    grade: job.grade || '',
    domain: job.domain || '',
    dg: job.dg || '',

    raw_snippet: job.raw_snippet || '',
    detail_text: job.detail_text || '',

    score: scoring.score,
    score_normalized: scoring.normalizedScore,
    category: scoring.category,
    positive_hits: scoring.positive.join(', '),
    negative_hits: scoring.negative.join(', '),
    hard_reject_hit: scoring.hardRejectHit ? 'yes' : '',

    first_seen_at: asDateOrBlank_(job.first_seen_at),
    last_seen_at: asDateOrBlank_(job.last_seen_at),
    notified_at: '',
    run_id: job.run_id || '',

    archived_at: '',
    archive_reason: '',
  };

  return JOBS_ALL_COLUMNS.map(col => rowObj[col] != null ? rowObj[col] : '');
}

function upsertJobsToAll_(newRows) {
  const idx = indexMap_(JOBS_ALL_COLUMNS);
  newRows = dedupeRowsByUniqueKey_(newRows, idx);

  if (!newRows.length) {
    return {
      jobs_upserted: 0,
      new_jobs: 0,
      updated_jobs: 0
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt. Bitte setupJobSheets() ausführen.');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sheetIdx = indexMap_(headers);

  const existingMap = new Map();
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const key = String(row[sheetIdx.unique_key] || '');
    if (key) existingMap.set(key, { rowNumber: r + 1, row });
  }

  const rowsToAppend = [];
  let newCount = 0;
  let updatedCount = 0;

  newRows.forEach(newRow => {
    const key = String(newRow[idx.unique_key] || '');
    if (!key) return;

    if (existingMap.has(key)) {
      const existing = existingMap.get(key);
      const rowNumber = existing.rowNumber;

      // Preserve stable system/history fields
      if (idx.first_seen_at != null && sheetIdx.first_seen_at != null) {
        newRow[idx.first_seen_at] =
          existing.row[sheetIdx.first_seen_at] || newRow[idx.first_seen_at];
      }

      if (idx.mail_date != null && sheetIdx.mail_date != null) {
        newRow[idx.mail_date] =
          existing.row[sheetIdx.mail_date] || newRow[idx.mail_date];
      }

      if (idx.notified_at != null && sheetIdx.notified_at != null) {
        newRow[idx.notified_at] =
          existing.row[sheetIdx.notified_at] || '';
      }

      if (idx.detail_text != null && sheetIdx.detail_text != null) {
        newRow[idx.detail_text] =
          newRow[idx.detail_text] || existing.row[sheetIdx.detail_text] || '';
      }

      if (idx.run_id != null && sheetIdx.run_id != null) {
        newRow[idx.run_id] =
          newRow[idx.run_id] || existing.row[sheetIdx.run_id] || '';
      }

      // Preserve archive fields
      if (idx.archived_at != null && sheetIdx.archived_at != null) {
        newRow[idx.archived_at] =
          existing.row[sheetIdx.archived_at] || '';
      }

      if (idx.archive_reason != null && sheetIdx.archive_reason != null) {
        newRow[idx.archive_reason] =
          existing.row[sheetIdx.archive_reason] || '';
      }

      sheet.getRange(rowNumber, 1, 1, newRow.length).setValues([newRow]);
      updatedCount++;

    } else {
      rowsToAppend.push(newRow);
      newCount++;
    }
  });

  if (rowsToAppend.length) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }

  return {
    jobs_upserted: newCount + updatedCount,
    new_jobs: newCount,
    updated_jobs: updatedCount
  };
}


function appendNotifiedRows_(sheet, rows, idx, notifiedAt) {
  const out = rows.map(row => [
    row[idx.unique_key] || '',
    notifiedAt,
    row[idx.category] || '',
    row[idx.score] || '',
    row[idx.title] || '',
    row[idx.employer] || '',
    row[idx.location] || '',
    row[idx.url] || '',
    row[idx.source] || '',
  ]);

  if (!out.length) return;

  sheet.getRange(sheet.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
}

function stampNotifiedAtInJobsAll_(jobsSheet, relevantRows, relIdx, notifiedAt) {
  const data = jobsSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idx = indexMap_(headers);

  const targetKeys = new Set(
    relevantRows.map(row => String(row[relIdx.unique_key] || '')).filter(Boolean)
  );

  if (!targetKeys.size) return;

  const notifiedCol = idx.notified_at;
  if (notifiedCol == null) {
    throw new Error('Column notified_at not found in Jobs_All');
  }

  const output = data.slice(1).map(row => {
    const key = String(row[idx.unique_key] || '');
    return [targetKeys.has(key) ? notifiedAt : row[notifiedCol]];
  });

Logger.log('notified_at col index: ' + notifiedCol);
Logger.log('header at notified_at col: ' + headers[notifiedCol]);

Logger.log('score_normalized col index: ' + idx.score_normalized);
Logger.log('header at score_normalized col: ' + headers[idx.score_normalized]);  

  jobsSheet
    .getRange(2, notifiedCol + 1, output.length, 1)
    .setValues(output);
}



function getNotifiedKeySet_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return new Set();
  const idx = indexMap_(data[0]);
  return new Set(data.slice(1).map(row => String(row[idx.unique_key] || '')).filter(Boolean));
}


function endOfDay_(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}


function formatDateForMail_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
}



function appendScanLogRow_(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.scanLog);
  if (!sheet) return;

  const row = [[
    entry.run_at || new Date(),
    entry.run_id || '',
    entry.source || '',
    entry.mode || '',
    entry.label_or_endpoint || '',
    entry.mail_threads || 0,
    entry.mail_messages || 0,
    entry.items_seen || 0,
    entry.jobs_parsed || 0,
    entry.rows_input_to_upsert || 0,
    entry.jobs_upserted || 0,
    entry.new_jobs || 0,
    entry.updated_jobs || 0,
    entry.relevant_count || 0,
    entry.maybe_count || 0,
    entry.ignore_count || 0,
    entry.detail_fetch_attempted || 0,
    entry.detail_fetch_count || 0,
    entry.duration_ms || 0,
    entry.status || 'ok',
    entry.message || ''
  ]];

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row[0].length).setValues(row);
}



function buildIgnoredJobsDebugSectionFromRows_(rows, headers) {
  if (!CONFIG.debugMail || !CONFIG.debugMail.includeIgnoredJobs) return '';

  const idx = indexMap_(headers);
  const maxPerSource = CONFIG.debugMail.maxIgnoredPerSource || 15;

  const ignoredRows = rows.filter(row => String(row[idx.category] || '') === 'Ignorieren');
  if (!ignoredRows.length) return '';

  const grouped = {};

  ignoredRows.forEach(row => {
    const source = String(row[idx.source] || 'OTHER');
    if (!grouped[source]) grouped[source] = [];
    grouped[source].push(row);
  });

  let out = 'IGNORIEREN (Debug)\n\n';

  Object.keys(grouped).sort().forEach(source => {
    const rowsForSource = grouped[source]
      .slice()
      .sort((a, b) => Number(b[idx.score] || 0) - Number(a[idx.score] || 0))
      .slice(0, maxPerSource);

    out += '[' + source + ']\n\n';

    rowsForSource.forEach(row => {
      const metaParts = [];
      if (row[idx.location]) metaParts.push(row[idx.location]);
      if (row[idx.employer]) metaParts.push(row[idx.employer]);

      out += '• ' + (row[idx.title] || 'Ohne Titel') + '\n';
      if (metaParts.length) out += '  ' + metaParts.join(' | ') + '\n';
      out += '  Score: ' + String(row[idx.score] ?? '') + '\n';

      if (row[idx.positive_hits]) out += '  + ' + row[idx.positive_hits] + '\n';
      if (row[idx.negative_hits]) out += '  - ' + row[idx.negative_hits] + '\n';
      if (row[idx.url]) out += '  ' + row[idx.url] + '\n';

      out += '\n';
    });
  });

  return out;
}



// *****************************************
// 4. SCORING
// *****************************************



//function to (manually) force update of scores for all, also old jobs
//scanners will update scores only of jobs which are currently (still) found
function rescoreJobsAllForSource_(sourceInput) {
  const sourceFilter = String(sourceInput || '').trim().toLowerCase();
  if (!sourceFilter) {
    throw new Error('Please provide a source, e.g. rescoreJobsAllForSource_("JOBROOM")');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet) throw new Error('Jobs_All fehlt.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      source: sourceFilter,
      rows_seen: 0,
      rows_matched: 0,
      rows_updated: 0,
      relevant_count: 0,
      maybe_count: 0,
      ignore_count: 0,
      hard_reject_count: 0
    };
  }

  const headers = data[0];
  const idx = indexMap_(headers);

  const requiredCols = [
    'source',
    'source_label',
    'raw_source_id',
    'url',
    'title',
    'employer',
    'location',
    'mail_date',
    'deadline',
    'percent_or_workload',
    'grade',
    'domain',
    'dg',
    'raw_snippet',
    'detail_text',
    'score',
    'score_normalized',
    'category',
    'positive_hits',
    'negative_hits',
    'hard_reject_hit'
  ];

  requiredCols.forEach(col => {
    if (idx[col] == null) {
      throw new Error('Required column missing in Jobs_All: ' + col);
    }
  });

  let rowsMatched = 0;
  let rowsUpdated = 0;
  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;
  let hardRejectCount = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rowSource = String(row[idx.source] || '').trim().toLowerCase();

    if (rowSource !== sourceFilter) continue;

    rowsMatched++;

    const job = {
      source: row[idx.source] || '',
      source_label: row[idx.source_label] || '',
      raw_source_id: row[idx.raw_source_id] || '',
      url: row[idx.url] || '',

      title: row[idx.title] || '',
      employer: row[idx.employer] || '',
      location: row[idx.location] || '',
      mail_date: row[idx.mail_date] || '',
      deadline: row[idx.deadline] || '',
      percent_or_workload: row[idx.percent_or_workload] || '',
      grade: row[idx.grade] || '',
      domain: row[idx.domain] || '',
      dg: row[idx.dg] || '',

      raw_snippet: row[idx.raw_snippet] || '',
      detail_text: row[idx.detail_text] || ''
    };

    const scoring = scoreJobBySource_(job);

    row[idx.score] = scoring.score;
    row[idx.score_normalized] = scoring.normalizedScore;
    row[idx.category] = scoring.category;
    row[idx.positive_hits] = (scoring.positive || []).join(', ');
    row[idx.negative_hits] = (scoring.negative || []).join(', ');
    row[idx.hard_reject_hit] = scoring.hardRejectHit ? 'yes' : '';

    if (String(scoring.category) === 'Relevant') relevantCount++;
    else if (String(scoring.category) === 'Vielleicht') maybeCount++;
    else ignoreCount++;

    if (scoring.hardRejectHit) hardRejectCount++;

    rowsUpdated++;
  }

  if (rowsUpdated > 0) {
    sheet.getRange(2, 1, data.length - 1, headers.length).setValues(data.slice(1));
  }

  return {
    source: sourceFilter,
    rows_seen: data.length - 1,
    rows_matched: rowsMatched,
    rows_updated: rowsUpdated,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    hard_reject_count: hardRejectCount
  };
}



function rescoreAllSources() {
  const sources = [
    'BUNDDE',
    'BUNDCH',
    'OEBB',
    'SBB',
    'KN',
    'ZRH',
    'AIRBUS',
    'EUCAREERS',
    'LH',
    'SKYGUIDE',
    'EUROCONTROL',
    'JOBROOM',
    'DB'
  ];

  let totalUpdated = 0;
  const results = [];

  sources.forEach(source => {
    const result = rescoreJobsAllForSource_(source);
    totalUpdated += Number(result.rows_updated || 0);
    results.push({
      source,
      rows_updated: Number(result.rows_updated || 0),
      rows_matched: Number(result.rows_matched || 0),
      relevant_count: Number(result.relevant_count || 0),
      maybe_count: Number(result.maybe_count || 0),
      ignore_count: Number(result.ignore_count || 0),
      hard_reject_count: Number(result.hard_reject_count || 0)
    });
  });

  const summary = {
    total_sources: sources.length,
    total_updated: totalUpdated,
    expected_total: 1661,
    difference: 1661 - totalUpdated,
    per_source: results
  };

  Logger.log(JSON.stringify(summary, null, 2));

  const sheet = SpreadsheetApp.getActive().getSheetByName('Jobs_All');
  const expectedTotal = sheet.getLastRow() - 1;

  if (totalUpdated !== expectedTotal) {
    throw new Error(
      'Sanity check failed: total_updated=' + totalUpdated + ', expected='+expectedTotal
    );
  }

  return summary;
}




function scoreJobBySource_(job) {
  const source = String(job.source || '').toLowerCase();

  let rules = null;
  if (source === 'bundch') rules = CONFIG.scoring.bund;
  else if (source === 'bundde') rules = CONFIG.scoring.bundde;
  else if (source === 'oebb') rules = CONFIG.scoring.oebb;
  else if (source === 'sbb') rules = CONFIG.scoring.sbb;
  else if (source === 'eucareers') {
    rules = job.source_label === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther
      : CONFIG.scoring.eu;
  }
  else if (source === 'lh') rules = CONFIG.scoring.lh;
  else if (source === 'skyguide') rules = CONFIG.scoring.skyguide;
  else if (source === 'kn') rules = CONFIG.scoring.kn;
  else if (source === 'zrh') rules = CONFIG.scoring.zrh;
  else if (source === 'airbus') rules = CONFIG.scoring.airbus;
  else if (source === 'eurocontrol') rules = CONFIG.scoring.eurocontrol;
  else if (source === 'jobroom') rules = CONFIG.scoring.jobroom;
  else if (source === 'db') rules = CONFIG.scoring.db;

  if (!rules) {
    throw new Error('No scoring rules configured for source: ' + source);
  }

  const gradePolicyResult = applyGradePolicy_(job, rules);
  if (gradePolicyResult) {
    return Object.assign({}, gradePolicyResult, {
      normalizedScore: -999
    });
  }

  const textForScoring = [
    job.title,
    job.percent_or_workload,
    job.grade,
    job.domain,
    job.dg,
    job.location,
    job.employer
  ].filter(Boolean).join(' ');

  const result = scoreEntry_(
    textForScoring,
    rules.positiveKeywords,
    rules.negativeKeywords,
    rules.bonusPatterns
  );

  let detailScore = 0;
  let detailPositive = [];
  let detailNegative = [];

  if (source === 'bundch' && job.detail_text) {
    const detailResult = scoreEntry_(
      job.detail_text,
      CONFIG.bundDetail.positiveKeywords,
      CONFIG.bundDetail.negativeKeywords,
      CONFIG.bundDetail.bonusPatterns
    );

    detailScore = Math.max(0, Math.min(CONFIG.bundDetail.maxBoost, detailResult.score));
    detailPositive = detailResult.positive.map(hit => 'DETAIL:' + hit);
    detailNegative = detailResult.negative.map(hit => 'DETAIL:' + hit);
  }

  const learning = getLearningAdjustment_(job);
  const dgAdjustment = getEuDgAdjustment_(job);
  const roleModel = scoreRoleModel_(job);

  const locationBoost = source === 'bundde'
    ? getBundDeLocationBoost_(job.location)
    : 0;

  const locationPositive = source === 'bundde'
    ? getBundDeLocationPositiveHits_(job.location)
    : [];

  const sourceHardRejectHit = containsHardReject_(textForScoring, rules.hardReject || []);

  const anyHardRejectHit = sourceHardRejectHit || roleModel.hardRejectHit;

  const baseScore = Number(result.score) || 0;
  const safeDetailScore = Number(detailScore) || 0;
  const safeLearningDelta = Number(learning.delta) || 0;
  const safeDgDelta = Number(dgAdjustment.delta) || 0;
  const safeRoleModelDelta = Number(roleModel.delta) || 0;
  const safeLocationBoost = Number(locationBoost) || 0;

  const finalScore =
    baseScore +
    safeDetailScore +
    safeLearningDelta +
    safeDgDelta +
    safeRoleModelDelta +
    safeLocationBoost;

  let category = assignCategory_(
    textForScoring,
    finalScore,
    rules.hardReject || [],
    rules.thresholds
  );

  if (anyHardRejectHit) {
    return {
      score: -999,
      normalizedScore: -999,
      positive: result.positive.concat(
        detailPositive,
        learning.positive,
        dgAdjustment.positive,
        roleModel.positive,
        locationPositive
      ),
      negative: result.negative.concat(
        detailNegative,
        learning.negative,
        dgAdjustment.negative,
        roleModel.negative
      ),
      hardRejectHit: true,
      category: 'Ignorieren',
    };
  }

  const thresholds = getSourceThresholds_(job.source, job.source_label);
  const normalizedScore = normalizeScoreByThresholds_(finalScore, thresholds);

  return {
    score: finalScore,
    normalizedScore,
    positive: result.positive.concat(
      detailPositive,
      learning.positive,
      dgAdjustment.positive,
      roleModel.positive,
      locationPositive
    ),
    negative: result.negative.concat(
      detailNegative,
      learning.negative,
      dgAdjustment.negative,
      roleModel.negative
    ),
    hardRejectHit: roleModel.hardRejectHit || sourceHardRejectHit,
    category,
  };
}



function applyGradePolicy_(job, rules) {
  const policy = rules && rules.gradePolicy;
  if (!policy || !policy.enabled) {
    return null;
  }
  
  const gradeText = normalizeText_(job.grade || '')
  .replace(/\s+/g, ' ')
  .trim();
  
  if (!gradeText) {
    return null;
  }
  
  const rejectList = policy.reject || [];
  const allowList = policy.allow || [];
  
  function matchesGradePattern_(text, pattern) {
    const escaped = String(pattern)
    .toLowerCase()
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
    
    const regex = new RegExp('(^|\\b)' + escaped + '(\\b|$)', 'i');
    return regex.test(text);
  }
  
  if (rejectList.some(pattern => matchesGradePattern_(gradeText, pattern))) {
    return {
      score: -999,
      positive: [],
      negative: ['GRADE:rejected'],
      hardRejectHit: true,
      category: 'Ignorieren',
    };
  }
  
  if (allowList.length && !allowList.some(pattern => matchesGradePattern_(gradeText, pattern))) {
    return {
      score: -999,
      positive: [],
      negative: ['GRADE:not-allowed'],
      hardRejectHit: true,
      category: 'Ignorieren',
    };
  }
  
  return null;
}






function scoreEntry_(text, positiveKeywords, negativeKeywords, bonusPatterns) {
  const normalized = normalizeText_(text);
  let score = 0;
  const positiveHits = [];
  const negativeHits = [];

  Object.keys(positiveKeywords || {}).forEach(key => {
    if (matchesConfiguredKeyword_(normalized, key)) {
      score += positiveKeywords[key];
      positiveHits.push(key);
    }
  });

  Object.keys(negativeKeywords || {}).forEach(key => {
    if (matchesConfiguredKeyword_(normalized, key)) {
      score += negativeKeywords[key];
      negativeHits.push(key);
    }
  });

  Object.keys(bonusPatterns || {}).forEach(key => {
    if (matchesConfiguredKeyword_(normalized, key)) {
      score += bonusPatterns[key];
      positiveHits.push('BONUS:' + key);
    }
  });

  return {
    score,
    positive: [...new Set(positiveHits)],
    negative: [...new Set(negativeHits)],
  };
}


function getRoleModelContextText_(job) {
  const source = String(job.source || '').toLowerCase();

  const parts = [
    job.percent_or_workload,
    job.grade,
    job.domain,
    job.dg,
    job.location,
    job.employer
  ];

  // raw_snippet nur dort verwenden, wo er wirklich jobspezifisch ist
  const allowRawSnippetSources = [
    'jobroom',
    'zrh',
    'eurocontrol',
    'eucareers',
    'db',
    'lh',
    'oebb',
    'sbb',
    'kn',
    'skyguide'
  ];

  if (allowRawSnippetSources.includes(source) && job.raw_snippet) {
    parts.push(job.raw_snippet);
  }

  return normalizeText_(parts.filter(Boolean).join(' '));
}


function matchesConfiguredKeyword_(text, keywordSpec) {
  const normalizedText = normalizeText_(text);
  const spec = normalizeText_(keywordSpec).trim();

  if (!spec) return false;

  // Explicit regex: re:...
  if (spec.startsWith('re:')) {
    const pattern = spec.slice(3);
    const regex = new RegExp(pattern, 'i');
    return regex.test(normalizedText);
  }

  // Prefix match: keyword*
  if (spec.endsWith('*')) {
    const prefix = spec.slice(0, -1).trim();
    if (!prefix) return false;

    const escaped = escapeRegex_(prefix).replace(/\s+/g, '\\s+');
    const regex = new RegExp('(^|\\b)' + escaped, 'i');
    return regex.test(normalizedText);
  }

  // Default: exact word / phrase with boundaries
  const escaped = escapeRegex_(spec).replace(/\s+/g, '\\s+');
  const regex = new RegExp('(^|\\b)' + escaped + '(\\b|$)', 'i');
  return regex.test(normalizedText);
}

function escapeRegex_(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function scoreRoleModel_(job) {
  const cfg = CONFIG.roleModel;
  if (!cfg) {
    return { delta: 0, positive: [], negative: [], hardRejectHit: false };
  }

  const source = String(job.source || '').toLowerCase();
  const enabledSources = cfg.enabledSources || [];
  if (enabledSources.length && !enabledSources.includes(source)) {
    return { delta: 0, positive: [], negative: [], hardRejectHit: false };
  }

  const titleText = normalizeText_(job.title || '');
  const contextText = getRoleModelContextText_(job);

  let delta = 0;
  const positive = [];
  const negative = [];

  Object.keys(cfg.titlePositiveKeywords || {}).forEach(key => {
    if (matchesConfiguredKeyword_(titleText, key)) {
      delta += cfg.titlePositiveKeywords[key];
      positive.push('ROLE:title:' + key);
    }
  });

  Object.keys(cfg.contextPositiveKeywords || {}).forEach(key => {
    if (matchesConfiguredKeyword_(contextText, key)) {
      delta += cfg.contextPositiveKeywords[key];
      positive.push('ROLE:ctx:' + key);
    }
  });

  Object.keys(cfg.negativeKeywords || {}).forEach(key => {
    if (
      matchesConfiguredKeyword_(titleText, key) ||
      matchesConfiguredKeyword_(contextText, key)
    ) {
      delta += cfg.negativeKeywords[key];
      negative.push('ROLE:neg:' + key);
    }
  });

  const hardRejectHit = containsHardReject_(
    [titleText, contextText].join(' '),
    cfg.hardReject || []
  );

  if (hardRejectHit) {
    delta -= 20;
  }

  delta = Math.max(-25, Math.min(25, delta));

  return {
    delta,
    positive: [...new Set(positive)],
    negative: [...new Set(negative)],
    hardRejectHit
  };
}


function getEuDgAdjustment_(job) {
  if (job.source_label !== 'Crawler/EU') {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const source = String(job.source || '').toLowerCase();
  if (source !== 'eucareers') {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const dg = String(job.dg || '').toUpperCase().trim();
  if (!dg) {
    return { delta: 0, positive: [], negative: [] };
  }
  
  const dgMap = (CONFIG.dgPriority && CONFIG.dgPriority.eu) || {};
  const value = dgMap[dg] || 0;
  
  if (!value) {
    return { delta: 0, positive: [], negative: [] };
  }
  
  return {
    delta: value,
    positive: value > 0 ? [`DG:${dg}(+${value})`] : [],
    negative: value < 0 ? [`DG:${dg}(${value})`] : [],
  };
}



function assignCategory_(text, score, hardRejectList, thresholds) {
  if (containsHardReject_(text, hardRejectList)) return 'Ignorieren';
  if (score >= thresholds.relevant) return 'Relevant';
  if (score >= thresholds.maybe) return 'Vielleicht';
  return 'Ignorieren';
}

function containsHardReject_(text, hardRejectList) {
  const normalized = normalizeText_(text);
  for (let i = 0; i < hardRejectList.length; i++) {
    if (matchesConfiguredKeyword_(normalized, hardRejectList[i])) return true;
  }
  return false;
}




function getSourceThresholds_(source, sourceLabel) {
  const src = String(source || '').toLowerCase();

  if (src === 'bundch') return CONFIG.scoring.bund.thresholds;
  if (src === 'bundde') return CONFIG.scoring.bundde.thresholds;
  if (src === 'oebb') return CONFIG.scoring.oebb.thresholds;
  if (src === 'sbb') return CONFIG.scoring.sbb.thresholds;
  if (src === 'kn') return CONFIG.scoring.kn.thresholds;
  if (src === 'zrh') return CONFIG.scoring.zrh.thresholds;
  if (src === 'airbus') return CONFIG.scoring.airbus.thresholds;
  if (src === 'lh') return CONFIG.scoring.lh.thresholds;
  if (src === 'skyguide') return CONFIG.scoring.skyguide.thresholds;
  if (src === 'eurocontrol') return CONFIG.scoring.eurocontrol.thresholds;
  if (src === 'jobroom') return CONFIG.scoring.jobroom.thresholds;
  if (src === 'db') return CONFIG.scoring.db.thresholds;

  if (src === 'eucareers') {
    return sourceLabel === 'Crawler/EU-other'
      ? CONFIG.scoring.euOther.thresholds
      : CONFIG.scoring.eu.thresholds;
  }

  throw new Error('No thresholds configured for source: ' + source);
}


function normalizeScoreByThresholds_(rawScore, thresholds) {
  const maybe = Number(thresholds.maybe || 0);
  const relevant = Number(thresholds.relevant || 0);

  if (relevant <= maybe) {
    throw new Error('Invalid thresholds: relevant must be greater than maybe');
  }

  const normalized = 10 * (Number(rawScore || 0) - maybe) / (relevant - maybe);

  return Math.round(normalized * 10) / 10; // 1 Dezimalstelle
}


// *****************************************
// SCORING DIAGNOSTICS
// *****************************************

function auditScoringOverlaps() {
  const report = auditScoringOverlaps_();
  Logger.log(JSON.stringify(report, null, 2));
}

function auditScoringOverlaps_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleTitlePos = Object.keys(roleModel.titlePositiveKeywords || {});
  const roleCtxPos = Object.keys(roleModel.contextPositiveKeywords || {});
  const roleNeg = Object.keys(roleModel.negativeKeywords || {});
  const roleHardReject = roleModel.hardReject || [];

  const sourceNames = Object.keys(scoring);
  const report = [];

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const srcPos = Object.keys(src.positiveKeywords || {});
    const srcNeg = Object.keys(src.negativeKeywords || {});
    const srcHardReject = src.hardReject || [];

    const overlaps = {
      source: sourceName,

      pos_vs_role_title_pos: intersectSorted_(srcPos, roleTitlePos),
      pos_vs_role_ctx_pos: intersectSorted_(srcPos, roleCtxPos),
      pos_vs_role_neg: intersectSorted_(srcPos, roleNeg),
      pos_vs_role_hard_reject: intersectSorted_(srcPos, roleHardReject),

      neg_vs_role_title_pos: intersectSorted_(srcNeg, roleTitlePos),
      neg_vs_role_ctx_pos: intersectSorted_(srcNeg, roleCtxPos),
      neg_vs_role_neg: intersectSorted_(srcNeg, roleNeg),
      neg_vs_role_hard_reject: intersectSorted_(srcNeg, roleHardReject),

      hard_reject_vs_role_title_pos: intersectSorted_(srcHardReject, roleTitlePos),
      hard_reject_vs_role_ctx_pos: intersectSorted_(srcHardReject, roleCtxPos),
      hard_reject_vs_role_neg: intersectSorted_(srcHardReject, roleNeg),
      hard_reject_vs_role_hard_reject: intersectSorted_(srcHardReject, roleHardReject),
    };

    report.push(overlaps);
  });

  Logger.log('=== SCORING OVERLAP AUDIT START ===');

  report.forEach(entry => {
    const hasAnyOverlap = Object.keys(entry).some(key => {
      return key !== 'source' && Array.isArray(entry[key]) && entry[key].length > 0;
    });

    if (!hasAnyOverlap) return;

    Logger.log('--- Source: ' + entry.source + ' ---');

    Object.keys(entry).forEach(key => {
      if (key === 'source') return;
      if (!entry[key].length) return;
      Logger.log(key + ': ' + entry[key].join(', '));
    });
  });

  Logger.log('=== SCORING OVERLAP AUDIT END ===');

  return report;
}

function intersectSorted_(a, b) {
  const setB = new Set((b || []).map(x => normalizeAuditToken_(x)));
  return [...new Set((a || []).map(x => normalizeAuditToken_(x)))]
    .filter(x => setB.has(x))
    .sort();
}

function normalizeAuditToken_(value) {
  return String(value || '').trim().toLowerCase();
}



//this one also considers overlaps (insted of just exact matches)

function auditScoringNearOverlaps() {
  const report = auditScoringNearOverlaps_();
  Logger.log(JSON.stringify(report, null, 2));
}

function auditScoringNearOverlaps_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleGroups = {
    role_title_pos: Object.keys(roleModel.titlePositiveKeywords || {}),
    role_ctx_pos: Object.keys(roleModel.contextPositiveKeywords || {}),
    role_neg: Object.keys(roleModel.negativeKeywords || {}),
    role_hard_reject: roleModel.hardReject || []
  };

  const sourceNames = Object.keys(scoring);
  const report = [];

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const sourceGroups = {
      src_pos: Object.keys(src.positiveKeywords || {}),
      src_neg: Object.keys(src.negativeKeywords || {}),
      src_hard_reject: src.hardReject || []
    };

    const entry = {
      source: sourceName,
      findings: []
    };

    Object.keys(sourceGroups).forEach(srcGroupName => {
      Object.keys(roleGroups).forEach(roleGroupName => {
        const matches = findNearOverlapPairs_(
          sourceGroups[srcGroupName],
          roleGroups[roleGroupName]
        );

        if (matches.length) {
          entry.findings.push({
            source_group: srcGroupName,
            role_group: roleGroupName,
            matches
          });
        }
      });
    });

    report.push(entry);
  });

  Logger.log('=== SCORING NEAR-OVERLAP AUDIT START ===');

  report.forEach(entry => {
    if (!entry.findings.length) return;

    Logger.log('--- Source: ' + entry.source + ' ---');

    entry.findings.forEach(groupFinding => {
      Logger.log(
        groupFinding.source_group + ' vs ' + groupFinding.role_group + ':'
      );

      groupFinding.matches.forEach(match => {
        Logger.log(
          '  [' + match.type + '] ' +
          '"' + match.left + '" <-> "' + match.right + '"'
        );
      });
    });
  });

  Logger.log('=== SCORING NEAR-OVERLAP AUDIT END ===');

  return report;
}

function findNearOverlapPairs_(leftList, rightList) {
  const left = [...new Set((leftList || []).map(normalizeAuditToken_))];
  const right = [...new Set((rightList || []).map(normalizeAuditToken_))];

  const out = [];
  const seen = new Set();

  left.forEach(l => {
    right.forEach(r => {
      if (!l || !r) return;
      if (l === r) return;

      // Zu kurze Tokens ignorieren, sonst zu viel Lärm
      if (Math.min(l.length, r.length) < 6) return;

      let type = '';

      if (l.includes(r)) {
        type = 'role_inside_source';
      } else if (r.includes(l)) {
        type = 'source_inside_role';
      } else {
        return;
      }

      // Noch etwas Lärmreduktion:
      // Wenn die Überlappung sehr kurz im Verhältnis zum längeren String ist, ignorieren.
      const shorter = l.length <= r.length ? l : r;
      const longer = l.length > r.length ? l : r;

      if (shorter.length / longer.length < 0.55) return;

      const key = [l, r, type].join(' || ');
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        left: l,
        right: r,
        type
      });
    });
  });

  return out.sort((a, b) => {
    if (a.left !== b.left) return a.left.localeCompare(b.left);
    if (a.right !== b.right) return a.right.localeCompare(b.right);
    return a.type.localeCompare(b.type);
  });
}

function normalizeAuditToken_(value) {
  return String(value || '').trim().toLowerCase();
}


function auditScoringConflictsFocused() {
  auditScoringConflictsFocused_();
}


function auditScoringConflictsFocused_() {
  const scoring = CONFIG.scoring || {};
  const roleModel = CONFIG.roleModel || {};

  const roleNeg = normalizeList_(Object.keys(roleModel.negativeKeywords || {}));
  const roleHard = normalizeList_(roleModel.hardReject || []);

  const sourceNames = Object.keys(scoring);

  Logger.log('=== FOCUSED SCORING CONFLICT AUDIT ===');

  sourceNames.forEach(sourceName => {
    const src = scoring[sourceName] || {};

    const srcNeg = normalizeList_(Object.keys(src.negativeKeywords || {}));
    const srcHard = normalizeList_(src.hardReject || []);

    const negNeg = intersectSimple_(srcNeg, roleNeg);
    const negHard = intersectSimple_(srcNeg, roleHard);
    const hardHard = intersectSimple_(srcHard, roleHard);

    if (!negNeg.length && !negHard.length && !hardHard.length) return;

    Logger.log('--- ' + sourceName + ' ---');

    if (negNeg.length) {
      Logger.log('NEG vs NEG (double penalty): ' + negNeg.join(', '));
    }

    if (negHard.length) {
      Logger.log('NEG vs HARD (inconsistent severity): ' + negHard.join(', '));
    }

    if (hardHard.length) {
      Logger.log('HARD vs HARD (redundant): ' + hardHard.join(', '));
    }
  });

  Logger.log('=== END ===');
}

function intersectSimple_(a, b) {
  const setB = new Set(b);
  return a.filter(x => setB.has(x)).sort();
}

function normalizeList_(list) {
  return [...new Set((list || []).map(x => String(x).toLowerCase().trim()))];
}







function analyzeOneSourceThreshold_(src) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const idx = {
    source: headers.indexOf('source'),
    title: headers.indexOf('title'),
    scoreNormalized: headers.indexOf('score_normalized'),
    finalScore: headers.indexOf('score'),
    category: headers.indexOf('category')
  };

  function getScoringConfigForSource_(sourceUpper) {
    const s = String(sourceUpper || '').trim().toUpperCase();
    if (s === 'JOBROOM') return CONFIG.scoring.jobroom;
    if (s === 'KN') return CONFIG.scoring.kn;
    if (s === 'DB') return CONFIG.scoring.db;
    if (s === 'BUNDDE') return CONFIG.scoring.bundde;
    throw new Error('No scoring config for source: ' + sourceUpper);
  }

  const cfg = getScoringConfigForSource_(src);
  const tRelevant = Number(cfg.thresholds.relevant);
  const tMaybe = Number(cfg.thresholds.maybe);

  const srcRows = rows.filter(r =>
    String(r[idx.source] || '').trim().toUpperCase() === String(src).toUpperCase()
  );

  srcRows.sort((a, b) => Number(b[idx.finalScore] || 0) - Number(a[idx.finalScore] || 0));

  const result = {
    source: src,
    thresholds: { relevant: tRelevant, maybe: tMaybe },
    counts: {
      total: srcRows.length,
      above_relevant: srcRows.filter(r => Number(r[idx.finalScore] || 0) >= tRelevant).length,
      above_maybe: srcRows.filter(r => Number(r[idx.finalScore] || 0) >= tMaybe).length,
      below_maybe: srcRows.filter(r => Number(r[idx.finalScore] || 0) < tMaybe).length
    },
    top_by_final_score: srcRows.slice(0, 15).map(r => ({
      title: r[idx.title],
      final_score: Number(r[idx.finalScore] || 0),
      score_normalized: Number(r[idx.scoreNormalized] || 0),
      category: r[idx.category]
    }))
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function analyzeSourceThresholds(sourcesToCheck = ['JOBROOM', 'KN', 'DB', 'BUNDDE']) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Jobs_All');
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const idx = {
    source: headers.indexOf('source'),
    title: headers.indexOf('title'),
    score: headers.indexOf('score_normalized'),
    finalScore: headers.indexOf('final_score'),
    category: headers.indexOf('category')
  };

  const results = {};

  sourcesToCheck.forEach(src => {
    const srcRows = rows.filter(r =>
      String(r[idx.source] || '').trim().toUpperCase() === src
    );

    if (!srcRows.length) return;

    // sort by score desc
    srcRows.sort((a, b) => (b[idx.score] || 0) - (a[idx.score] || 0));

    const scores = srcRows.map(r => Number(r[idx.score] || 0));

    // thresholds aus config holen (wichtig: echte Funktion bei dir einsetzen!)
    const cfg = SOURCE_CONFIG[src];
    const tRelevant = cfg.thresholds.relevant;
    const tMaybe = cfg.thresholds.maybe;

    // Kandidaten knapp unter thresholds
    const nearRelevant = srcRows
      .filter(r => {
        const s = Number(r[idx.score] || 0);
        return s < tRelevant && s >= tRelevant - 2;
      })
      .slice(0, 5)
      .map(r => ({
        title: r[idx.title],
        score: r[idx.score]
      }));

    const nearMaybe = srcRows
      .filter(r => {
        const s = Number(r[idx.score] || 0);
        return s < tMaybe && s >= tMaybe - 2;
      })
      .slice(0, 5)
      .map(r => ({
        title: r[idx.title],
        score: r[idx.score]
      }));

    const counts = {
      total: srcRows.length,
      aboveRelevant: scores.filter(s => s >= tRelevant).length,
      aboveMaybe: scores.filter(s => s >= tMaybe).length,
      belowMaybe: scores.filter(s => s < tMaybe).length
    };

    results[src] = {
      thresholds: { relevant: tRelevant, maybe: tMaybe },
      topScores: scores.slice(0, 10),
      counts,
      nearRelevant,
      nearMaybe
    };
  });

  Logger.log(JSON.stringify(results, null, 2));
}


function analyzeThresholdsBUNDDE() {
  analyzeOneSourceThreshold_('BUNDDE');
}





// *****************************************
// 5. LEARNING
// *****************************************


function refreshLearningCache_() {
  LEARNING_CACHE = buildLearningProfile_();
}

function buildLearningProfile_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { tokenScores: {}, sourceScores: {} };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const tokenScores = {};
  const sourceScores = {};
  
  data.slice(1).forEach(row => {
    const manualRating = normalizeText_(row[idx.manual_rating] || '');
    const clicked = normalizeText_(row[idx.clicked_or_applied] || '');
    const source = String(row[idx.source] || '').toLowerCase();
    const text = [row[idx.title], row[idx.employer], row[idx.location]]
    .filter(Boolean)
    .join(' ');
    
    let weight = 0;
    
    if (manualRating === 'gut') weight += 4;
    else if (manualRating === 'vielleicht') weight += 1;
    else if (manualRating === 'nein') weight -= 5;
    
    if (clicked === 'ja' || clicked === 'yes' || clicked === 'applied' || clicked === 'clicked') {
      weight += 3;
    }
    
    if (!weight) return;
    
    const tokens = tokenizeForLearning_(text);
    
    tokens.forEach(token => {
      tokenScores[token] = (tokenScores[token] || 0) + weight;
    });
    
    if (source) {
      sourceScores[source] = (sourceScores[source] || 0) + Math.sign(weight);
    }
  });
  
  return { tokenScores, sourceScores };
}

function tokenizeForLearning_(text) {
  const stopwords = new Set([
  'und','oder','mit','der','die','das','für','fuer','von','im','in','am','an','auf','des','dem','den',
  'the','and','with','job','jobs','stelle','stellen','bereich','senior','junior','professional',
  'leiter','leiterin','mitarbeiter','mitarbeiterin','spezialist','spezialistin','manager','managerin',
  'bundesamt','bundesverwaltung','schweiz','bern','zuerich','wien','oebb','bundch','sbb', 'deutschschweiz', 'online', 'seit'
  ]);
  
  return [...new Set(
  normalizeText_(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .split(/\s+/)
  .filter(token => token && token.length >= 4 && !stopwords.has(token))
  )];
}

function getLearningAdjustment_(job) {
  const profile = LEARNING_CACHE || { tokenScores: {}, sourceScores: {} };
  const source = String(job.source || '').toLowerCase();
  const text = [job.title, job.employer, job.location]
  .filter(Boolean)
  .join(' ');
  const tokens = tokenizeForLearning_(text);
  
  let delta = 0;
  const positive = [];
  const negative = [];
  
  tokens.forEach(token => {
    const tokenScore = profile.tokenScores[token] || 0;
    if (!tokenScore) return;
    
    const contribution = Math.max(-3, Math.min(3, tokenScore));
    delta += contribution;
    
    if (contribution > 0) positive.push(`LEARN:${token}(+${contribution})`);
    if (contribution < 0) negative.push(`LEARN:${token}(${contribution})`);
  });
  
  if (profile.sourceScores[source]) {
    const sourceContribution = Math.max(-2, Math.min(2, profile.sourceScores[source]));
    delta += sourceContribution;
    
    if (sourceContribution > 0) positive.push(`LEARN:source(+${sourceContribution})`);
    if (sourceContribution < 0) negative.push(`LEARN:source(${sourceContribution})`);
  }
  
  delta = Math.max(-8, Math.min(8, delta));
  
  return {
    delta,
    positive: [...new Set(positive)].slice(0, 6),
    negative: [...new Set(negative)].slice(0, 6),
  };
}



// *****************************************
// 5B. ARCHIVIERUNG
// *****************************************

function archiveJobRow_(row, idx, reason, batchId, by) {
  if (idx.status != null) {
    row[idx.status] = 'archived';
  }

  if (idx.archived_at != null) {
    row[idx.archived_at] = new Date();
  }

  if (idx.archive_reason != null) {
    row[idx.archive_reason] = reason || 'manual';
  }

  if (idx.archive_batch_id != null) {
    row[idx.archive_batch_id] = batchId || '';
  }

  if (idx.archived_by != null) {
    row[idx.archived_by] = by || 'manual';
  }
}


function unarchiveJobRow_(row, idx) {
  if (idx.status != null) {
    row[idx.status] = 'open';
  }

  if (idx.archived_at != null) {
    row[idx.archived_at] = '';
  }

  if (idx.archive_reason != null) {
    row[idx.archive_reason] = '';
  }

  if (idx.archive_batch_id != null) {
    row[idx.archive_batch_id] = '';
  }

  if (idx.archived_by != null) {
    row[idx.archived_by] = '';
  }
}


function zzz_ADMIN_archiveOldOpenJobs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Archivierung starten',
    'Diese Funktion archiviert alte offene Jobs. Fortfahren?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  zzz_ADMIN_archiveOldOpenJobs_();
}


function zzz_ADMIN_archiveOldOpenJobs_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  const batchId = Utilities.getUuid();
  let changed = 0;

  rows.forEach(row => {
    const status = String(row[idx.status] || '').trim().toLowerCase();
    if (status !== 'open') return;

    const quickFlag = String(row[idx.quick_flag] || '').trim();
    if (quickFlag) return;

    const applicationStatus = String(row[idx.application_status] || '').trim();
    if (applicationStatus) return;

    const deadline = row[idx.deadline] instanceof Date ? row[idx.deadline] : null;
    const firstSeen = row[idx.first_seen_at] instanceof Date ? row[idx.first_seen_at] : null;

    const oldDeadline = deadline && deadline < cutoff;
    const noDeadline = !deadline;
    const oldFirstSeen = firstSeen && firstSeen < cutoff;

    const finalCategory = normalizeCategoryLabel_(row[idx.final_category]);
    const manualOverride = normalizeCategoryLabel_(row[idx.manual_category_override]);

    const oldWithoutDeadline = noDeadline && oldFirstSeen;
    const oldAndIgnored =
      oldFirstSeen &&
      (manualOverride === 'Ignorieren' || finalCategory === 'Ignorieren');

    if (oldDeadline || oldWithoutDeadline || oldAndIgnored) {
      archiveJobRow_(row, idx, 'old_open_job', batchId, 'auto');
      changed++;
    }
  });

  if (!changed) {
    Logger.log('Archived jobs: 0');
    return;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('Archived jobs: ' + changed);
}


function zzz_ADMIN_archiveOldOpenJobs_DRYRUN() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.jobsAll);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);
  const rows = data.slice(1);

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  let affected = 0;

  rows.forEach(row => {

    const status = String(row[idx.status] || '').trim().toLowerCase();
    if (status !== 'open') return;

    const quickFlag = String(row[idx.quick_flag] || '').trim();
    if (quickFlag) return;

    const applicationStatus = String(row[idx.application_status] || '').trim();
    if (applicationStatus) return;

    const deadline = row[idx.deadline] instanceof Date ? row[idx.deadline] : null;
    const firstSeen = row[idx.first_seen_at] instanceof Date ? row[idx.first_seen_at] : null;

    const oldDeadline = deadline && deadline < cutoff;
    const noDeadline = !deadline;
    const oldFirstSeen = firstSeen && firstSeen < cutoff;

    const finalCategory = normalizeCategoryLabel_(row[idx.final_category]);
    const manualOverride = normalizeCategoryLabel_(row[idx.manual_category_override]);

    const oldWithoutDeadline = noDeadline && oldFirstSeen;

    const oldAndIgnored =
      oldFirstSeen &&
      (manualOverride === 'Ignorieren' || finalCategory === 'Ignorieren');

    if (oldDeadline || oldWithoutDeadline || oldAndIgnored) {
      affected++;
    }

  });

  Logger.log('Jobs that WOULD be archived: ' + affected);
}




// *****************************************
// 6A. NEUE, KANONISCHE SCANNER-ARCHITEKTUR
// *****************************************

function buildCanonicalJob_(fields) {
  return {
    source: fields.source || '',
    source_label: fields.source_label || '',
    raw_source_id: fields.raw_source_id || '',
    url: fields.url || '',

    title: fields.title || '',
    employer: fields.employer || '',
    location: fields.location || '',
    mail_date: fields.mail_date || '',
    deadline: fields.deadline || '',
    percent_or_workload: fields.percent_or_workload || '',
    grade: fields.grade || '',
    domain: fields.domain || '',
    dg: fields.dg || '',

    raw_snippet: fields.raw_snippet || '',
    detail_text: fields.detail_text || '',

    first_seen_at: fields.first_seen_at || '',
    last_seen_at: fields.last_seen_at || '',
    run_id: fields.run_id || ''
  };
}

// *****************************************
// 6B. bund.de Crawler RSS
// - has location boost
// *****************************************


const BUNDDE_TARGET_STATES = [
  'berlin',
  'brandenburg',
  'hamburg',
  'baden-württemberg',
  'bayern'
];

const BUNDDE_QUERIES = [
  'ökonom',
  'referent',
  //'wissenschaftlich',
  //'analyst'
];

function scanBundDeRssToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const states = BUNDDE_TARGET_STATES;
  const queries = BUNDDE_QUERIES;

  const collectedJobs = [];
  let itemsSeen = 0;

  queries.forEach(query => {
    const rssUrl = buildBundDeRssUrl_(query, states);
    const items = fetchBundDeRssItems_(rssUrl);

    itemsSeen += items.length;

    items.forEach(item => {
      const title = cleanBundDeText_(htmlDecode_(item.getChildText('title') || ''));
      const link = cleanBundDeUrl_(item.getChildText('link') || '');
      const guid = cleanBundDeUrl_(item.getChildText('guid') || link);
      const pubDateRaw = item.getChildText('pubDate') || '';
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : '';

      const descriptionRaw = item.getChildText('description') || '';
      const parsed = parseBundDeRssDescription_(descriptionRaw);

      collectedJobs.push(
        buildCanonicalJob_({
          source: 'BundDE',
          source_label: 'RSS/BundDE',
          raw_source_id: guid,
          url: guid,

          title: title,
          employer: parsed.employer || '',
          location: parsed.location || '',
          mail_date: pubDate || '',
          deadline: parsed.deadline || '',

          percent_or_workload: '',
          grade: '',
          domain: '',
          dg: '',

          raw_snippet: parsed.raw_snippet || '',
          detail_text: '',

          first_seen_at: new Date(),
          last_seen_at: new Date(),
          run_id: runId
        })
      );
    });
  });

  const dedupedJobs = dedupeBundDeRssJobsByGuid_(collectedJobs);
  const normalizedRows = dedupedJobs.map(job => normalizeJobRecord_(job));
  const upsertStats = upsertJobsToAll_(normalizedRows);

  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  normalizedRows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'BundDE',
    mode: 'rss',
    label_or_endpoint: 'RSS/BundDE',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: dedupedJobs.length,
    rows_input_to_upsert: normalizedRows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}


function buildBundDeRssUrl_(query, states) {
  query = query || 'ökonom';
  states = states || [];

  const base = 'https://www.service.bund.de/Content/DE/Stellen/Suche/Formular.html';

  const params = [
    'nn=4642046',
    'type=0',
    'resultsPerPage=100',
    'templateQueryString=' + encodeURIComponent(query),
    'cl2Categories_AnstellungsdauerNeu=' + encodeURIComponent('_unbefristet'),
    'sortOrder=' + encodeURIComponent('dateOfIssue_dt desc'),
    'jobsrss=true'
  ];

  states.forEach(state => {
    params.push('cl2Addresses_Adresse_State=' + encodeURIComponent(state));
  });

  return base + '?' + params.join('&');
}


function fetchBundDeRssItems_(rssUrl) {
  const xml = UrlFetchApp.fetch(rssUrl, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  }).getContentText();

  const doc = XmlService.parse(xml);
  const root = doc.getRootElement();
  const channel = root.getChild('channel');
  if (!channel) return [];

  return channel.getChildren('item') || [];
}

function parseBundDeRssDescription_(html) {
  const clean = String(html || '');

  const employerMatch = clean.match(/Arbeitgeber:\s*<strong>(.*?)<\/strong>/i);
  const locationMatch = clean.match(/Ort:\s*<strong>(.*?)<\/strong>/i);
  const deadlineMatch = clean.match(/Bewerbungsfrist:\s*<strong>(.*?)<\/strong>/i);

  const employer = employerMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(stripHtmlZrh_(employerMatch[1]))))
    : '';

  const location = locationMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(stripHtmlZrh_(locationMatch[1]))))
    : '';

  const deadlineText = deadlineMatch
    ? cleanBundDeText_(decodeNumericHtmlEntities_(htmlDecode_(deadlineMatch[1])))
    : '';

  return {
    employer,
    location,
    deadline: parseBundDeDate_(deadlineText),
    raw_snippet: [
      employer ? ('Arbeitgeber: ' + employer) : '',
      location ? ('Ort: ' + location) : '',
      deadlineText ? ('Bewerbungsfrist: ' + deadlineText) : ''
    ].filter(Boolean).join(' | ')
  };
}

function cleanBundDeUrl_(url) {
  let s = String(url || '').trim();
  if (!s) return '';
  s = s.replace(/#.*$/, '');
  return s;
}


function dedupeBundDeRssJobsByGuid_(jobs) {
  const seen = new Map();

  jobs.forEach(job => {
    const key = cleanBundDeUrl_(job.raw_source_id || job.url || '');
    if (!key) return;

    if (!seen.has(key)) {
      seen.set(key, job);
    }
  });

  return Array.from(seen.values());
}

function decodeNumericHtmlEntities_(text) {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function getBundDeLocationBoost_(location) {
  const loc = normalizeText_(location);

  if (!loc) {
    return { delta: 0, positive: [], negative: [] };
  }

  if (loc.includes('berlin')) {
    return { delta: 2.5, positive: ['LOC:berlin'], negative: [] };
  }
  if (loc.includes('potsdam')) {
    return { delta: 2.0, positive: ['LOC:potsdam'], negative: [] };
  }
  if (loc.includes('hamburg')) {
    return { delta: 2.0, positive: ['LOC:hamburg'], negative: [] };
  }
  if (loc.includes('münchen') || loc.includes('muenchen')) {
    return { delta: 1.5, positive: ['LOC:münchen'], negative: [] };
  }
  if (loc.includes('stuttgart')) {
    return { delta: 1.5, positive: ['LOC:stuttgart'], negative: [] };
  }

  return { delta: 0, positive: [], negative: [] };
}


//for scoring
function getBundDeLocationPositiveHits_(location) {
  const loc = normalizeText_(location);
  if (!loc) return [];

  if (loc.includes('berlin')) return ['LOC:berlin'];
  if (loc.includes('potsdam')) return ['LOC:potsdam'];
  if (loc.includes('hamburg')) return ['LOC:hamburg'];
  if (loc.includes('münchen') || loc.includes('muenchen')) return ['LOC:münchen'];
  if (loc.includes('stuttgart')) return ['LOC:stuttgart'];

  return [];
}


// *****************************************
// 6C. bund.de Crawler (ALT bzw. BACKUP)
// *****************************************




function scanBundDeJobsToAllRELICT(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const states = BUNDDE_TARGET_STATES;
  const queries = BUNDDE_QUERIES;

  const extractedJobs = [];
  let itemsSeen = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  queries.forEach(query => {
    const firstPageHtml = fetchBundDeSearchResultsRaw_(query, 1, states);
    const totalPages = extractBundDeTotalPages_(firstPageHtml);
    const maxPages = Math.min(totalPages, 3);

    for (let page = 1; page <= maxPages; page++) {
      const html = page === 1
        ? firstPageHtml
        : fetchBundDeSearchResultsRaw_(query, page, states);

      const pageJobs = extractBundDeJobsFromRaw_(html);

      itemsSeen += pageJobs.length;
      extractedJobs.push.apply(extractedJobs, pageJobs);
    }
  });

  const dedupedJobs = dedupeBundDeJobsByCanonicalUrl_(extractedJobs);

  const enrichedJobs = dedupedJobs.map(job => {
    if (!shouldFetchBundDeDetail_(job)) return job;

    detailFetchAttempted++;
    const enriched = enrichBundDeJobFromDetailPage_(job);
    if (enriched && enriched.location) detailFetchCount++;
    return enriched;
  });

  const canonicalJobs = enrichedJobs.map(job =>
    buildCanonicalJob_({
      source: 'BundDE',
      source_label: 'Crawler/BundDE',
      raw_source_id: job.raw_source_id || job.url || '',
      url: job.url || '',

      title: job.title || '',
      employer: job.employer || '',
      location: job.location || '',
      mail_date: job.mail_date || new Date(),
      deadline: job.deadline || '',
      percent_or_workload: job.percent_or_workload || '',
      grade: job.grade || '',
      domain: job.domain || '',
      dg: job.dg || '',

      raw_snippet: job.raw_snippet || '',
      detail_text: job.detail_text || '',

      first_seen_at: new Date(),
      last_seen_at: new Date(),
      run_id: runId
    })
  );

  const normalizedRows = canonicalJobs.map(job => normalizeJobRecord_(job));
  const upsertStats = upsertJobsToAll_(normalizedRows);

  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  normalizedRows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'BundDE',
    mode: 'crawler',
    label_or_endpoint: 'Crawler/BundDE',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: dedupedJobs.length,
    rows_input_to_upsert: normalizedRows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: detailFetchAttempted,
    detail_fetch_count: detailFetchCount,
    status: 'ok',
    message: ''
  };
}


function dedupeBundDeJobsByCanonicalUrl_(jobs) {
  const seen = new Map();

  jobs.forEach(job => {
    const key = canonicalizeBundDeUrl_(job.url || job.raw_source_id || '');
    if (!key) return;
    if (!seen.has(key)) {
      seen.set(key, Object.assign({}, job, {
        url: key,
        raw_source_id: key
      }));
    }
  });

  return Array.from(seen.values());
}


function fetchBundDeSearchResultsRaw_(query, page, states) {
  query = query || 'ökonom';
  page = page || 1;
  states = states || [];

  const baseUrl = 'https://www.service.bund.de/Content/DE/Stellen/Suche/Formular.html';

  const params = [
    'nn=4642046',
    'resourceId=4642034',
    'input_=4642046',
    'pageLocale=de',
    'type=0',
    'submit=Finden',
    'resultsPerPage=100',
    'templateQueryString=' + encodeURIComponent(query),
    'gts=' + encodeURIComponent('4642266_list=dateOfIssue_dt+desc'),
    'cl2Categories_AnstellungsdauerNeu=' + encodeURIComponent('_unbefristet')
  ];

  states.forEach(state => {
    params.push('cl2Addresses_Adresse_State=' + encodeURIComponent(state));
  });

  if (page > 1) {
    params.push('gtp=' + encodeURIComponent('4642266_list=' + page));
  }

  const url = baseUrl + '?' + params.join('&');

  const res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('BundDE fetch failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 500));
  }

  return res.getContentText();
}

function extractBundDeJobsFromRaw_(raw) {
  const html = String(raw || '');
  const jobs = [];

  const listMatch = html.match(/<ul class="result-list">([\s\S]*?)<\/ul>/i);
  if (!listMatch) return jobs;

  const listHtml = listMatch[1];

  const itemRegex = /<li>\s*<a href="([^"]+)"[\s\S]*?<h3>\s*<em>Stellenbezeichnung<\/em>([\s\S]*?)<\/h3>[\s\S]*?<p>\s*<em>Arbeitgeber<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<p>\s*<em>Veröffentlicht<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<p>\s*<em>Bewerbungsfrist<\/em>\s*([\s\S]*?)<\/p>[\s\S]*?<\/a>\s*<\/li>/gi;

  let match;
  while ((match = itemRegex.exec(listHtml)) !== null) {
    const relativeUrl = htmlDecode_(match[1].trim());
    const rawUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : 'https://www.service.bund.de/' + relativeUrl.replace(/^\/+/, '');

    const url = canonicalizeBundDeUrl_(rawUrl);

    const title = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[2])));
    const employer = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[3])));
    const publishedText = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[4])));
    const deadlineText = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(match[5])));

    const mailDate = parseBundDeDate_(publishedText);
    const deadline = parseBundDeDate_(deadlineText);

    const rawSnippet = [
      title,
      employer,
      publishedText ? ('Veröffentlicht: ' + publishedText) : '',
      deadlineText ? ('Bewerbungsfrist: ' + deadlineText) : ''
    ].filter(Boolean).join(' | ');

    jobs.push({
      title,
      employer,
      location: '',
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      mail_date: mailDate || '',
      deadline: deadline || '',
      url,
      raw_source_id: url,
      raw_snippet: rawSnippet
    });
  }

  return jobs;
}


function cleanBundDeText_(text) {
  return String(text || '')
    .replace(/\u00AD/g, '')   // soft hyphen
    .replace(/\u200B/g, '')   // zero width space
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBundDeDate_(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
  if (!m) return '';

  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = Number(m[3]);

  if (year < 100) {
    year += 2000;
  }

  return new Date(year, month, day);
}


function extractBundDeTotalPages_(html) {
  const text = String(html || '');

  const m = text.match(/<p>\s*(\d+)\s+von\s+(\d+)\s*<\/p>/i);
  if (!m) return 1;

  return Number(m[2]) || 1;
}



function fetchBundDeDetailHtml_(url) {
  let lastError = null;

  for (let i = 0; i < 3; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error('BundDE detail fetch failed: HTTP ' + code + ' | url=' + url);
      }

      return res.getContentText();
    } catch (e) {
      lastError = e;
      Utilities.sleep(1000);
    }
  }

  throw lastError;
}

function extractBundDeLocationFromDetailHtml_(html) {
  const source = String(html || '');

  const dtMatch = source.match(/<dt>\s*Ort\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (dtMatch) {
    let raw = String(dtMatch[1] || '');

    raw = raw.replace(/<br\s*\/?>[\s\S]*$/i, ' ');
    raw = raw.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, ' ');

    const value = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(raw)));
    if (value) return value;
  }

  const mapMatch = source.match(/data-marker-tooltip="([^"]+)"/i);
  if (mapMatch) {
    const value = cleanBundDeText_(htmlDecode_(mapMatch[1]));
    if (value) return value;
  }

  return '';
}

function extractBundDeGradeFromDetailHtml_(html) {
  const source = String(html || '');

  const dtMatch = source.match(/<dt>\s*Laufbahn\s*\/\s*Entgeltgruppe\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (!dtMatch) return '';

  return cleanBundDeText_(htmlDecode_(stripHtmlZrh_(dtMatch[1])));
}

function extractBundDeDetailText_(html) {
  const text = cleanBundDeText_(htmlDecode_(stripHtmlZrh_(String(html || ''))));
  return text ? text.slice(0, 5000) : '';
}

function enrichBundDeJobFromDetailPage_(job) {
  if (!job || !job.url) return job;

  const cleanUrl = canonicalizeBundDeUrl_(job.url);

  try {
    const html = fetchBundDeDetailHtml_(cleanUrl);

    const location = extractBundDeLocationFromDetailHtml_(html);
    const grade = extractBundDeGradeFromDetailHtml_(html);
    const detailText = extractBundDeDetailText_(html);

    return Object.assign({}, job, {
      url: cleanUrl,
      raw_source_id: cleanUrl,
      location: location || job.location || '',
      grade: grade || job.grade || '',
      detail_text: detailText || job.detail_text || ''
    });
  } catch (e) {
    Logger.log('BundDE detail fetch failed for ' + cleanUrl + ': ' + e);
    return Object.assign({}, job, {
      url: cleanUrl,
      raw_source_id: cleanUrl
    });
  }
}


function shouldFetchBundDeDetail_(job) {
  const text = normalizeText_(
    cleanBundDeText_([
      job.title,
      job.employer,
      job.raw_snippet
    ].filter(Boolean).join(' '))
  );

  const triggers = [
    'referent',
    'oekonom',
    'ökonom',
    'wissenschaftlich',
    'analyse',
    'analyst',
    'grundsatz',
    'strategie',
    'data',
    'daten',
    'modell'
  ];

  return triggers.some(t => text.includes(normalizeText_(t)));
}


function canonicalizeBundDeUrl_(url) {
  let s = String(url || '').trim();
  if (!s) return '';

  s = s.replace(/;jsessionid=[^?]+/i, '');
  s = s.replace(/(\/[^\/]+\.html).*/i, '$1');

  if (!/^https?:\/\//i.test(s)) {
    s = 'https://www.service.bund.de/' + s.replace(/^\/+/, '');
  }

  return s;
}




// *****************************************
// 6C. BUND
// *****************************************



function isBundMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  if (!from.includes('job@stelle.admin.ch') && !from.includes('@stelle.admin.ch')) return false;
  
  return /jobs\.admin\.ch\/offene-stellen\//i.test(html);
}


function scanBundJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();
  BUND_DETAIL_FETCH_COUNT = 0;

  const labelName = CONFIG.gmailLabels.bund;
  const messages = getMessagesForLabel_(labelName)
    .filter(isBundMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.bundLookbackDays));

  const threadIds = new Set();
  const bundle = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const snippet = buildShortSnippet_(message);
    const jobs = extractBundJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      const baseJob = {
        source: 'BundCH',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.pensum,
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: snippet,
        raw_source_id: message.getId(),
        run_id: runId,
      };

      bundle.push({
        job: baseJob,
        quickScore: quickRankBundJob_(baseJob),
      });
    });
  });

  bundle.sort((a, b) => b.quickScore - a.quickScore);

  const rows = bundle.map((entry, index) => {
    const shouldEnrich =
      CONFIG.bundDetail &&
      CONFIG.bundDetail.enabled &&
      index < CONFIG.bundDetail.maxFetchesPerRun &&
      shouldFetchBundDetail_(entry.job);

    let finalJob = entry.job;

    if (shouldEnrich) {
      detailFetchAttempted++;
      finalJob = enrichBundJobFromDetailPage_(entry.job, true);
    }

    return normalizeJobRecord_(finalJob);
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'Bund',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: detailFetchAttempted,
    detail_fetch_count: BUND_DETAIL_FETCH_COUNT,
    status: 'ok',
    message: ''
  };
}



function quickRankBundJob_(job) {
  const text = [
  job.title,
  job.location,
  job.employer,
  job.percent_or_workload
  ].filter(Boolean).join(' ');
  
  const result = scoreEntry_(
  text,
  CONFIG.scoring.bund.positiveKeywords,
  CONFIG.scoring.bund.negativeKeywords,
  CONFIG.scoring.bund.bonusPatterns
  );
  
  let score = result.score;
  
  const title = normalizeText_(job.title || '');
  
  // Kleine Priorisierung für potenziell "versteckt gute" Rollen
  if (title.includes('mathematik')) score += 3;
  if (title.includes('mathematisch')) score += 2;
  if (title.includes('leiter')) score += 2;
  if (title.includes('leitung')) score += 2;
  if (title.includes('modell')) score += 2;
  if (title.includes('versicherung')) score += 2;
  if (title.includes('finanz')) score += 2;
  
  return score;
}



function shouldFetchBundDetail_(job) {
  const cfg = CONFIG.bundDetail;
  if (!cfg || !cfg.enabled) return false;
  if (!job || !job.url) return false;
  
  const title = normalizeText_(job.title || '');
  
  const highPriorityPatterns = [
  'mathematik',
  'mathematisch',
  'ökonom',
  'oekonom',
  'modell',
  'versicherung',
  'finanz'
  ];
  
  const normalPatterns = cfg.triggerTitlePatterns || [];
  
  const matchedHighPriority = highPriorityPatterns.find(pattern => title.includes(pattern));
  if (matchedHighPriority) {
    Logger.log('BUND DETAIL YES: ' + job.title + ' | high-priority=' + matchedHighPriority + ' | count=' + BUND_DETAIL_FETCH_COUNT);
    return true;
  }
  
  const matchedNormal = normalPatterns.find(pattern => title.includes(pattern));
  if (!matchedNormal) {
    Logger.log('BUND DETAIL NO: ' + job.title + ' | reason=no-trigger-match');
    return false;
  }
  
  if (BUND_DETAIL_FETCH_COUNT >= cfg.maxFetchesPerRun) {
    Logger.log('BUND DETAIL NO: ' + job.title + ' | reason=limit-reached | count=' + BUND_DETAIL_FETCH_COUNT);
    return false;
  }
  
  Logger.log('BUND DETAIL YES: ' + job.title + ' | trigger=' + matchedNormal + ' | count=' + BUND_DETAIL_FETCH_COUNT);
  return true;
}


function enrichBundJobFromDetailPage_(job, forceFetch) {
  const cfg = CONFIG.bundDetail;
  if (!cfg || !cfg.enabled) return job;
  if (!job || !job.url) return job;
  
  if (!forceFetch && !shouldFetchBundDetail_(job)) return job;
  if (BUND_DETAIL_FETCH_COUNT >= cfg.maxFetchesPerRun) return job;
  
  try {
    const html = fetchWithRetry_(job.url).getContentText();
    
    const detailText = extractBundDetailText_(html);
    if (!detailText) return job;
    
    BUND_DETAIL_FETCH_COUNT++;
    
    return Object.assign({}, job, {
      detail_text: detailText
    });
    
  } catch (e) {
    Logger.log('Bund detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}

function extractBundDetailText_(html) {
  const text = String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
  
  if (!text) return '';
  
  const markers = [
  'Diesen Beitrag können Sie leisten',
  'Das macht Sie einzigartig',
  'Auf den Punkt gebracht',
  'Zusätzliche Informationen'
  ];
  
  const parts = [];
  
  markers.forEach(marker => {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      parts.push(text.slice(idx, idx + 1200));
    }
  });
  
  if (parts.length) {
    return parts.join(' ');
  }
  
  return text.slice(0, 3000);
}


function extractBundJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const regex = /<a href="(https:\/\/jobs\.admin\.ch\/offene-stellen\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?<span[^>]*>[\s\S]*?([0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)\s*\|\s*([^|<]+)\s*\|\s*([^<]+?)\s*<\/span>/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      url: htmlDecode_(match[1].trim()),
      title: htmlDecode_(match[2].trim()),
      pensum: htmlDecode_(match[3].trim()),
      location: htmlDecode_(match[4].trim()),
      employer: htmlDecode_(match[5].trim()),
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function rescoreBundCH() {
  const result = rescoreJobsAllForSource_('BUNDCH');
  Logger.log(JSON.stringify(result, null, 2));
}

// *****************************************
// 7. MAILQUELLEN
// *****************************************

// *****************************************
// OEBB
// *****************************************


function isOebbMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return /oebb\.csod\.com/i.test(html)
  || /oebb\.csod\.com/i.test(plain)
  || /job-alert@oebb\.recruitmail\.com/i.test(from);
}


function extractOebbJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const regex = /<p[^>]*font-weight:700[^>]*>([^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>[\s\S]*?<a[^>]*href=['"](https:\/\/oebb\.csod\.com\/[^'"]+)['"]/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      title: htmlDecode_(match[1].trim()),
      location: htmlDecode_(match[2].trim()),
      url: htmlDecode_(match[3].trim()),
      rawSnippet: `${match[1]} | ${match[2]}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanOebbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.oebb;
  const messages = getMessagesForLabel_(labelName)
    .filter(isOebbMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.oebbLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractOebbJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'OEBB',
        source_label: labelName,
        mail_date: mailDate,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: 'ÖBB',
        percent_or_workload: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: message.getId(),
        run_id: runId,
      }));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'OEBB',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// SBB
// *****************************************


function isSbbMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('no-reply@hrs.sbb.ch')
  || from.includes('@hrs.sbb.ch')
  || /jobs\.sbb\.ch\/v2\/offene-stellen\//i.test(html)
  || /jobs\.sbb\.ch\/v2\/offene-stellen\//i.test(plain);
}



function extractSbbJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const blockRegex = /<a class="job-title"[^>]*href="(https:\/\/jobs\.sbb\.ch\/v2\/offene-stellen\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>\s*([^<]+?)\s*<\/span>[\s\S]*?(?:Online seit:|zur Jobbeschreibung)/gi;
  
  let match;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    const meta = htmlDecode_(match[3].trim());
    
    let percent = '';
    let location = meta;
    
    const metaMatch = meta.match(/([0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)\s*,\s*(.+)/);
    if (metaMatch) {
      percent = metaMatch[1].trim();
      location = metaMatch[2].trim();
    }
    
    jobs.push({
      url,
      title,
      percent_or_workload: percent,
      location,
      rawSnippet: `${title} | ${percent} | ${location}`,
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanSbbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.sbb;
  const messages = getMessagesForLabel_(labelName)
    .filter(isSbbMailCandidate_)
    .filter(message =>
      isMessageRecentEnough_(message.getDate(), CONFIG.recency.sbbLookbackDays)
    );

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';

    const jobs = extractSbbJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(
        normalizeJobRecord_({
          source: 'SBB',
          source_label: labelName,
          mail_date: mailDate,
          deadline: '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: message.getId(),
          gmail_thread_id: message.getThread().getId(),
          title: job.title,
          location: job.location,
          employer: job.employer || 'SBB',
          percent_or_workload: job.percent_or_workload || '',
          grade: '',
          domain: '',
          dg: '',
          url: job.url,
          raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
          raw_source_id: message.getId(),
          run_id: runId
        })
      );
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'SBB',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}


// *****************************************
// LH
// *****************************************

function isLhMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('career@services.dlh.de')
  || from.includes('@services.dlh.de')
  || /apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=/i.test(html)
  || /apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=/i.test(plain);
}


function extractLhJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&uuml;/gi, 'ü')
  .replace(/&auml;/gi, 'ä')
  .replace(/&szlig;/gi, 'ß')
  .replace(/&amp;/gi, '&');
  
  const regex = /\d+\.\s*<a href="(https:\/\/apply\.lufthansagroup\.careers\/index\.php\?ac=jobad&id=\d+)"[^>]*>([^<]+)<\/a>\s*<br \/?>\s*&nbsp;&nbsp;Gesellschaft:\s*([^<]+)\s*<br \/?>\s*&nbsp;&nbsp;Standort:\s*([^<]+)\s*<br/gi;
  
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    jobs.push({
      url: htmlDecode_(match[1].trim()),
      title: htmlDecode_(match[2].trim()),
      employer: htmlDecode_(match[3].trim()),
      location: htmlDecode_(match[4].trim()),
      rawSnippet: `${match[2]} | ${match[3]} | ${match[4]}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}



function scanLhJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.lh;
  const messages = getMessagesForLabel_(labelName)
    .filter(isLhMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.lhLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractLhJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'LH',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: message.getId(),
        run_id: runId,
      }));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'LH',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// ZRH
// *****************************************

function isZrhMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return from.includes('no-reply@prospective.ch')
  && /job-newsletter vom flughafen z/i.test(subject)
  && /jobs-karriere\.flughafen-zuerich\.ch\/offene-stellen\//i.test(html);
}




function extractZrhJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ');
  
  const itemRegex = /<a[^>]*href="(https:\/\/jobs-karriere\.flughafen-zuerich\.ch\/offene-stellen\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?(?=<tr>\s*<td width="24"|<a class="button"|Du erhältst diese E-Mail|$)/gi;
  
  let match;
  while ((match = itemRegex.exec(cleaned)) !== null) {
    const block = match[0];
    
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    
    const descMatch = block.match(/<span class="shortdescription"[^>]*>([\s\S]*?)<\/span>/i);
    const description = descMatch ? htmlDecode_(stripHtmlZrh_(descMatch[1])) : '';
    
    const tagMatches = [...block.matchAll(/<span style="display:inline-block;[\s\S]*?>([\s\S]*?)<\/span>/gi)]
    .map(m => htmlDecode_(stripHtmlZrh_(m[1])))
    .map(s => s.trim())
    .filter(Boolean);
    
    const domain = tagMatches[0] || '';
    const grade = tagMatches[1] || '';
    const percent_or_workload = tagMatches[2] || '';
    
    jobs.push({
      title,
      location: '',
      employer: 'Flughafen Zürich AG',
      percent_or_workload,
      grade,
      domain,
      dg: '',
      description,
      url,
      rawSnippet: `${title} | ${domain} | ${grade} | ${percent_or_workload} | ${description}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanZrhJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.zrh;
  const messages = getMessagesForLabel_(labelName)
    .filter(isZrhMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.zrhLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractZrhJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'ZRH',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Flughafen Zürich AG',
        percent_or_workload: job.percent_or_workload || '',
        grade: job.grade || '',
        domain: job.domain || '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: message.getId(),
        run_id: runId,
      }));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'ZRH',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}


// *****************************************
// KN
// *****************************************



function isKnMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');
  
  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;
  
  return (
  from.includes('jobsuche@arbeitsagentur.de') ||
  from.includes('@arbeitsagentur.de') ||
  /neues zu ihrer stellensuche/i.test(subject) ||
  /arbeitsagentur\.de\/jobsuche\/jobdetail\//i.test(html) ||
  /arbeitsagentur\.de\/jobsuche\/jobdetail\//i.test(plain)
  );
}


function extractKnJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
    .replace(/=\r?\n/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/=3D/g, '=')
    .replace(/=C3=BC/gi, 'ü')
    .replace(/=C3=A4/gi, 'ä')
    .replace(/=C3=B6/gi, 'ö')
    .replace(/=C3=9F/gi, 'ß')
    .replace(/=C3=A9/gi, 'é')
    .replace(/=20/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const blocks = cleaned.match(
    /<h2[\s\S]*?<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+"[\s\S]*?(?=<h2[\s\S]*?<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/|Alle aktuellen Stellen ansehen|Ihre Stellensuchen verwalten|<\/body>|$)/gi
  ) || [];
  
  blocks.forEach(block => {
    const urlMatch = block.match(/<a[^>]*href="(https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+)"/i);
    if (!urlMatch) return;
    
    const url = htmlDecode_(urlMatch[1].trim());
    
    const titleAnchorMatch = block.match(/<a[^>]*href="https:\/\/www\.arbeitsagentur\.de\/jobsuche\/jobdetail\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleAnchorMatch
      ? htmlDecode_(stripHtmlKn_(titleAnchorMatch[1]).replace(/^\d+\.\s*/, '').trim())
      : '';
    
    const employerMatch = block.match(/<p[^>]*>\s*([^<]+?)\s*<\/p>/i);
    const employer = employerMatch ? htmlDecode_(employerMatch[1].trim()) : '';
    
    const metaValues = [...block.matchAll(/<span>([^<]+)<\/span>/gi)]
      .map(m => htmlDecode_(m[1].trim()))
      .filter(Boolean)
      .filter(v =>
        !/^stelle ansehen$/i.test(v) &&
        !/^\d+\.$/.test(v)
      );
    
    let location = '';
    let workload = '';
    let contractType = '';
    
    metaValues.forEach(v => {
      if (!location && /\(\d+\s*km\)|konstanz|kreuzlingen|radolfzell|singen|friedrichshafen/i.test(v)) {
        location = v;
        return;
      }
      
      if (!workload && /(vollzeit|teilzeit|minijob|homeoffice|schicht|nachtarbeit|wochenende)/i.test(v)) {
        workload = v;
        return;
      }
      
      if (!contractType && /(unbefristet|befristet|festanstellung|praktikum|ausbildung|duales studium)/i.test(v)) {
        contractType = v;
      }
    });
    
    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: [workload, contractType].filter(Boolean).join(' | '),
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, employer, location, workload, contractType].filter(Boolean).join(' | ')
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}


function extractKnJobIdFromUrl_(url) {
  const m = String(url || '').match(/\/jobsuche\/jobdetail\/([^/?#]+)/i);
  return m ? m[1].trim() : '';
}

function extractKnJobsFromApiResponse_(json) {
  const jobs = [];
  const items = (json && json.stellenangebote) || [];

  items.forEach(item => {
    const refnr = String(item.refnr || '').trim();
    const hashId = String(item.kundennummerHash || '').trim();

    const ort = item.arbeitsort || {};
    const location = [
      ort.plz,
      ort.ort,
      ort.region
    ].filter(Boolean).join(' ').trim();

    const title = String(item.titel || item.beruf || '').trim();
    const employer = String(item.arbeitgeber || '').trim();

    const publicationDate = item.aktuelleVeroeffentlichungsdatum
      ? new Date(item.aktuelleVeroeffentlichungsdatum)
      : new Date();

    const url = item.externeUrl
      ? String(item.externeUrl).trim()
      : (refnr
          ? 'https://www.arbeitsagentur.de/jobsuche/jobdetail/' + encodeURIComponent(refnr)
          : '');

    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      deadline: '',
      publication_date: publicationDate,
      url,
      rawSnippet: [title, employer, location, refnr].filter(Boolean).join(' | '),
      raw_source_id: refnr || hashId || url
    });
  });

  return dedupeJobsByMiniKey_(jobs);
}

function looksTruncatedKnTitle_(title) {
  const t = String(title || '').trim();
  if (!t) return false;
  
  return (
  t.length >= 45 &&
  !/[.!?:)]$/.test(t) &&
  /\b(i|im|in|für|mit|am|an|der|die|das)\s*$/i.test(t)
  );
}


function extractKnTitleFromDetailHtml_(html) {
  const cleaned = String(html || '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/\s+/g, ' ')
  .trim();
  
  const genericTitles = new Set([
  'Detailansicht des Stellenangebots',
  'Stellenangebot',
  'Jobsuche',
  'Detailansicht'
  ]);
  
  // 1) JSON-LD / strukturierte Daten versuchen
  const jsonLdMatches = [...cleaned.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const text = htmlDecode_(m[1]);
      const data = JSON.parse(text);
      
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        const title = item && (item.title || item.name);
        if (title && !genericTitles.has(String(title).trim())) {
          return String(title).trim();
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // 2) Meta property / og:title
  const ogTitleMatch = cleaned.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  || cleaned.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (ogTitleMatch) {
    const title = htmlDecode_(ogTitleMatch[1]).trim();
    if (title && !genericTitles.has(title)) {
      return title.replace(/\s*[-|–]\s*Jobsuche.*$/i, '').trim();
    }
  }
  
  // 3) Document title
  const titleMatch = cleaned.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  if (titleMatch) {
    const title = htmlDecode_(titleMatch[1])
    .replace(/\s*[-|–]\s*Jobsuche.*$/i, '')
    .trim();
    
    if (title && !genericTitles.has(title)) {
      return title;
    }
  }
  
  // 4) h1 nur verwenden, wenn nicht generisch
  const h1Match = cleaned.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i);
  if (h1Match) {
    const title = htmlDecode_(h1Match[1]).trim();
    if (title && !genericTitles.has(title)) {
      return title;
    }
  }
  
  return '';
}


function enrichKnJobFromDetailPage_(job) {
  if (!job || !job.url) return job;
  
  try {
    const html = fetchWithRetry_(job.url).getContentText();
    const fullTitle = extractKnTitleFromDetailHtml_(html);
    
    //Logger.log('KN DETAIL URL: ' + job.url);
    //Logger.log('KN DETAIL TITLE: ' + fullTitle);
    
    const oldTitle = String(job.title || '').trim();
    const newTitle = String(fullTitle || '').trim();
    const employer = String(job.employer || '').trim();
    
    if (!newTitle) return job;
    if (/^detailansicht des stellenangebots$/i.test(newTitle)) return job;
    if (newTitle.length <= oldTitle.length) return job;
    
    const normalizedOld = normalizeText_(oldTitle);
    const normalizedNew = normalizeText_(newTitle);
    const normalizedEmployer = normalizeText_(employer);
    
    if (
    normalizedEmployer &&
    normalizedNew === `${normalizedOld} bei ${normalizedEmployer}`
    ) {
      return job;
    }
    
    return Object.assign({}, job, {
      title: newTitle,
      raw_snippet: [newTitle, job.employer, job.location, job.percent_or_workload]
      .filter(Boolean)
      .join(' | ')
    });
  } catch (e) {
    //Logger.log('KN detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}





function scanKnJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.kn;
  const messages = getMessagesForLabel_(labelName)
    .filter(isKnMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.knLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractKnJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      let finalJob = {
        source: 'KN',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        raw_source_id: extractKnJobIdFromUrl_(job.url) || job.url,
        run_id: runId,
      };

      if (looksTruncatedKnTitle_(finalJob.title)) {
        detailFetchAttempted++;
        const oldTitle = String(finalJob.title || '');
        finalJob = enrichKnJobFromDetailPage_(finalJob);
        if (String(finalJob.title || '') !== oldTitle) {
          detailFetchCount++;
        }
      }

      rows.push(normalizeJobRecord_(finalJob));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'KN',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: detailFetchAttempted,
    detail_fetch_count: detailFetchCount,
    status: 'ok',
    message: ''
  };
}


function rescoreKN() {
  const result = rescoreJobsAllForSource_('KN');
  Logger.log(JSON.stringify(result, null, 2));
}

// *****************************************
// AIRBUS
// *****************************************

function isAirbusMailCandidate_(message) {
  const subject = String(message.getSubject() || '');
  const from = String(message.getFrom() || '').toLowerCase();
  const html = String(message.getBody() || '');
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '');

  if (/^\[Job-Alert Elmar\]/i.test(subject)) return false;
  if (from.includes('dennis.gartner@gmail.com')) return false;
  if (from.includes('elmar.fuddel@gmail.com')) return false;

  return (
    from.includes('@myworkday.com') &&
    /ag\.wd3\.myworkdayjobs\.com\/Airbus\//i.test(html + ' ' + plain)
  );
}


function extractAirbusJobsFromHtml_(html) {
  const jobs = [];
  const cleaned = cleanWorkdayMailHtml_(html);

  const linkRegex = /<a[^>]*href="(https:\/\/[^"]*myworkdayjobs\.com\/[^"]*JR\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(cleaned)) !== null) {
    const fullMatch = match[0];
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(stripHtmlKn_(match[2]).trim());
    const rawSourceId = extractWorkdayJobIdFromUrl_(url);

    if (!title || !url || !rawSourceId) continue;

    const afterAnchor = cleaned.slice(linkRegex.lastIndex, linkRegex.lastIndex + 220);
    const location = extractAirbusLocationFromFollowingHtml_(afterAnchor);

    jobs.push({
      title,
      location,
      employer: 'Airbus',
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, location].filter(Boolean).join(' | '),
      raw_source_id: rawSourceId
    });
  }

  return dedupeJobsByMiniKey_(jobs);
}


function shouldFetchAirbusDetail_(job) {
  const text = normalizeText_([
    job.title,
    job.location,
    job.employer
  ].filter(Boolean).join(' '));

  const hardSkip = [
    'apprentice',
    'apprenti',
    'alternant',
    'working student',
    'werkstudent',
    'internship',
    'intern',
    'stagiaire',
    'student',
    'trainee'
  ];

  if (containsHardReject_(text, hardSkip)) return false;

  const fetchSignals = [
    'analyst',
    'analysis',
    'data',
    'strategy',
    'strategic',
    'lean',
    'performance',
    'improvement',
    'business',
    'innovation',
    'quality',
    'transformation',
    'planning'
  ];

  return fetchSignals.some(signal => text.includes(signal));
}


function enrichAirbusJobFromDetailPage_(job) {
  if (!job || !job.url) return job;
  if (!shouldFetchAirbusDetail_(job)) return job;

  try {
    const html = fetchWithRetry_(job.url).getContentText();
    const detail = extractWorkdayDetailFromHtml_(html, {
      fallbackEmployer: 'Airbus',
      departmentLabels: ['Department', 'Organization', 'Organisation', 'Job Family'],
      employmentTypeLabels: ['Employment type', 'Worker Type', 'Time Type']
    });

    return Object.assign({}, job, {
      detail_text: detail.detail_text || '',
      employer: detail.employer || job.employer || 'Airbus',
      domain: detail.department || job.domain || '',
      //percent_or_workload: detail.employmentType || job.percent_or_workload || ''
    });
  } catch (e) {
    Logger.log('Airbus detail fetch failed for ' + job.url + ': ' + e);
    return job;
  }
}


function scanAirbusJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const labelName = CONFIG.gmailLabels.airbus;
  const messages = getMessagesForLabel_(labelName)
    .filter(isAirbusMailCandidate_)
    .filter(message => isMessageRecentEnough_(message.getDate(), CONFIG.recency.airbusLookbackDays));

  const threadIds = new Set();
  const rows = [];
  let parsedJobsCount = 0;
  let detailFetchAttempted = 0;
  let detailFetchCount = 0;

  messages.forEach(message => {
    threadIds.add(message.getThread().getId());

    const mailDate = message.getDate();
    const html = message.getBody() || '';
    const jobs = extractAirbusJobsFromHtml_(html);

    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      let finalJob = {
        source: 'AIRBUS',
        source_label: labelName,
        mail_date: mailDate,
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: message.getId(),
        gmail_thread_id: message.getThread().getId(),
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Airbus',
        percent_or_workload: '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || buildShortSnippet_(message) || '',
        detail_text: '',
        raw_source_id: job.raw_source_id || extractWorkdayJobIdFromUrl_(job.url),
        run_id: runId
      };

      const shouldFetch =
        CONFIG.airbusDetail &&
        CONFIG.airbusDetail.enabled &&
        detailFetchCount < CONFIG.airbusDetail.maxFetchesPerRun &&
        shouldFetchAirbusDetail_(finalJob);

      if (shouldFetch) {
        detailFetchAttempted++;
        const beforeDetail = finalJob.detail_text || '';
        finalJob = enrichAirbusJobFromDetailPage_(finalJob);
        const afterDetail = finalJob.detail_text || '';
        if (afterDetail && afterDetail !== beforeDetail) {
          detailFetchCount++;
        }
      }

      rows.push(normalizeJobRecord_(finalJob));
    });
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'Airbus',
    mode: 'mail',
    label_or_endpoint: labelName,
    mail_threads: threadIds.size,
    mail_messages: messages.length,
    items_seen: parsedJobsCount,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: detailFetchAttempted,
    detail_fetch_count: detailFetchCount,
    status: 'ok',
    message: ''
  };
}


function testAirbusParser() {
  const threads = GmailApp.search('label:Jobs/Airbus', 0, 1);
  if (!threads.length) {
    Logger.log('Keine Threads mit Label Jobs/Airbus gefunden.');
    return;
  }

  const message = threads[0].getMessages()[0];
  const jobs = extractAirbusJobsFromHtml_(message.getBody() || '');

  Logger.log('Airbus jobs found: ' + jobs.length);
  jobs.slice(0, 20).forEach((job, i) => {
    Logger.log(
      (i + 1) + '. ' +
      JSON.stringify(job)
    );
  });
}


function testAirbusFirstPromisingDetail() {
  const threads = GmailApp.search('label:Jobs/Airbus', 0, 1);
  if (!threads.length) {
    Logger.log('Keine Threads mit Label Jobs/Airbus gefunden.');
    return;
  }

  const message = threads[0].getMessages()[0];
  const jobs = extractAirbusJobsFromHtml_(message.getBody() || '');

  const promising = jobs.find(job => shouldFetchAirbusDetail_(job));

  if (!promising) {
    Logger.log('Kein promising Airbus-Job gefunden.');
    return;
  }

  Logger.log('Testing detail fetch for: ' + promising.title + ' | ' + promising.url);

  const enriched = enrichAirbusJobFromDetailPage_(promising);
  Logger.log(JSON.stringify(enriched, null, 2));
}


function rescoreAirbus() {
  const result = rescoreJobsAllForSource_('AIRBUS');
  Logger.log(JSON.stringify(result, null, 2));
}


// *****************************************
// 8. CRAWLER / API-QUELLEN
// *****************************************

// *****************************************
// EU
// *****************************************


function buildEuCareersUrl_(page) {
  return `https://eu-careers.europa.eu/en/non-permanent-contract-ec?domain=&field_epso_type_of_contract_target_id=All&field_epso_location_target_id=All&order=created&sort=desc&page=${page}`;
}

function buildEuOtherUrl_(page) {
  const base = 'https://eu-careers.europa.eu/en/temporary-agents-other-institutions-vacancies';
  const params =
  '?domain=' +
  '&field_epso_type_of_contract_target_id=All' +
  '&field_epso_location_target_id=All' +
  '&institution=All' +
  '&order=created' +
  '&sort=desc';
  
  if (!page) return base + params;
  return base + params + '&page=' + page;
}



function extractEuCareersJobsFromHtml_(html, kind) {
  const jobs = [];
  
  const inferredKind = kind || (
  /temporary-agents-other-institutions-vacancies/i.test(String(html || ''))
  ? 'other'
  : 'commission'
  );
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ');
  
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/gi;
  
  let match;
  
  while ((match = rowRegex.exec(cleaned)) !== null) {
    const rowHtml = match[0];
    const url = absolutizeEuUrl_(match[1].trim());
    const title = htmlDecode_(match[2].trim());
    
    if (!title || title.length < 5) continue;
    if (/cookies policy|privacy policy/i.test(title)) continue;
    if (!/eu-careers\.europa\.eu\/en\/job-opportunities\//i.test(url)) continue;
    
    const tdValues = [...rowHtml.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)]
    .map(m => htmlDecode_(stripHtmlEu_(m[1])).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let domain = '';
    let dg = '';
    let grade = '';
    let location = '';
    let publicationDate = '';
    let deadline = '';
    let employer = '';
    
    if (inferredKind === 'commission') {
      // Bestehende Commission-Logik weitgehend behalten
      tdValues.forEach(value => {
        if (!grade && /\b(FG\s*[IVX]+|AD\s*\d|AST(?:-SC)?(?:\s*\d)?(?:,\s*AST(?:-SC)?\s*\d)*)/i.test(value)) {
          grade = value;
          return;
        }
        
        if (!publicationDate && /\b\d{2}\/\d{2}\/\d{4}\b/.test(value) && !/\d{2}:\d{2}/.test(value)) {
          publicationDate = value;
          return;
        }
        
        if (!deadline && /\b\d{2}\/\d{2}\/\d{4}\b/.test(value) && /\d{2}:\d{2}/.test(value)) {
          deadline = value;
          return;
        }
        
        if (
        !location &&
        /\([A-Za-z]+\)$/.test(value) &&
        !/^\([A-Z]+\)/.test(value)
        ) {
          location = value;
          return;
        }
      });
      
      const urlTail = url.toLowerCase();
      
      if (/ecfin/.test(urlTail)) dg = dg || 'ECFIN';
      else if (/digit/.test(urlTail)) dg = dg || 'DIGIT';
      else if (/cnect/.test(urlTail)) dg = dg || 'CNECT';
      else if (/budg/.test(urlTail)) dg = dg || 'BUDG';
      else if (/comp/.test(urlTail)) dg = dg || 'COMP';
      else if (/move/.test(urlTail)) dg = dg || 'MOVE';
      else if (/trade/.test(urlTail)) dg = dg || 'TRADE';
      else if (/sj-/.test(urlTail)) dg = dg || 'SJ';
      else if (/sg-/.test(urlTail)) dg = dg || 'SG';
      else if (/intpa/.test(urlTail)) dg = dg || 'INTPA';
      
      if (/\b(economist|economic|finance|statistics|statistician)\b/i.test(title)) {
        domain = 'Economics, Finance and Statistics';
      } else if (/\b(legal|law)\b/i.test(title)) {
        domain = 'Legal Affairs';
      } else if (/\b(ict|it|security|digital|project)\b/i.test(title)) {
        domain = 'Information Technologies';
      }
      
      employer = 'European Commission';
      
    } else {
      // EU-other: positionsbasiert + leichte Fallbacks
      // Typische Reihenfolge:
      // [domain?] [institution?] [grade?] [location?] [publication date] [deadline]
      
      tdValues.forEach(value => {
        if (!grade && /\b(FG\s*[IVX]+|AD\s*\d+|AST(?:-SC)?\s*\d+)\b/i.test(value)) {
          grade = value;
          return;
        }
        
        if (!publicationDate && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          publicationDate = value;
          return;
        }
        
        if (!deadline && /^\d{2}\/\d{2}\/\d{4}(?:\s*-\s*\d{2}:\d{2})?$/.test(value)) {
          // Wenn publicationDate schon belegt ist, ist ein zweites Datumsfeld sehr wahrscheinlich deadline
          if (publicationDate) {
            deadline = value;
            return;
          }
        }
        
        if (
        !location &&
        /\([A-Za-z]+\)$/.test(value) &&
        !/^\([A-Z]+\)/.test(value)
        ) {
          location = value;
          return;
        }
        
        if (
        !employer &&
        /^\([A-Z]+\)\s+/.test(value)
        ) {
          employer = value;
          return;
        }
        
        if (
        !domain &&
        /economics|finance|statistics|legal affairs|information technologies/i.test(value)
        ) {
          domain = value;
          return;
        }
      });
      
      // Falls domain aus Tabelle nicht sauber kam: Titelheuristik
      if (!domain) {
        if (/\b(economist|economic|finance|statistics|statistician)\b/i.test(title)) {
          domain = 'Economics, Finance and Statistics';
        } else if (/\b(legal|law)\b/i.test(title)) {
          domain = 'Legal Affairs';
        } else if (/\b(ict|it|security|digital|project)\b/i.test(title)) {
          domain = 'Information Technologies';
        }
      }
      
      // Fallback: employer aus URL nicht ideal, daher lieber generisch
      // Employer-Erkennung für EU-other
      if (!employer) {
        
        // 1. Klassische EU-Agentur-Schreibweise: "(EDA) European Defence Agency"
        const agencyMatch = tdValues.find(v =>
        /^\([A-Z]+\)\s+/.test(v)
        );
        
        if (agencyMatch) {
          employer = agencyMatch;
        }
      }
      
      // 2. Fallback: Institution ohne Klammerkürzel
      if (!employer) {
        
        const employerFallback = tdValues.find(value => {
          if (value === title) return false;
          if (value === domain) return false;
          if (value === grade) return false;
          if (value === location) return false;
          if (value === publicationDate) return false;
          if (value === deadline) return false;
          
          if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return false;
          if (/\b(FG\s*[IVX]+|AD\s*\d+|AST(?:-SC)?\s*\d+)\b/i.test(value)) return false;
          if (/\([A-Za-z]+\)$/.test(value)) return false;
          
          return value.length > 4;
        });
        
        if (employerFallback) {
          employer = employerFallback;
        }
      }
      
      // 3. letzter Fallback
      if (!employer) {
        employer = 'EU Agency';
      }
    }
    
    jobs.push({
      title,
      domain,
      dg,
      grade,
      location,
      publication_date: parseEuDate_(publicationDate),
      deadline: parseEuDeadline_(deadline || publicationDate),
      employer,
      url,
      rawSnippet: [title, employer, location, domain, dg, grade, publicationDate, deadline]
      .filter(Boolean)
      .join(' | ')
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}




function absolutizeEuUrl_(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return "https://eu-careers.europa.eu" + url;
  return "https://eu-careers.europa.eu/" + url;
}

function parseEuDate_(text) {
  if (!text) return "";
  
  const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return "";
  
  return new Date(
  Number(m[3]),
  Number(m[2]) - 1,
  Number(m[1])
  );
}

function parseEuDeadline_(text) {
  if (!text) return "";
  
  const m = String(text).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?/);
  if (!m) return "";
  
  return new Date(
  Number(m[3]),
  Number(m[2]) - 1,
  Number(m[1]),
  Number(m[4] || 0),
  Number(m[5] || 0),
  0
  );
}



function scanEuCareersJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 3;
  let itemsSeen = 0;
  let parsedJobsCount = 0;

  const sources = [
    {
      label: 'Crawler/EU',
      buildUrl: buildEuCareersUrl_,
      kind: 'commission'
    },
    {
      label: 'Crawler/EU-other',
      buildUrl: buildEuOtherUrl_,
      kind: 'other'
    }
  ];

  sources.forEach(src => {
    for (let page = 0; page < pagesToScan; page++) {
      const url = src.buildUrl(page);
      const html = fetchWithRetry_(url).getContentText();

      const jobs = extractEuCareersJobsFromHtml_(html, src.kind);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
        rows.push(normalizeJobRecord_({
          source: 'EUCAREERS',
          source_label: src.label,
          mail_date: job.publication_date || new Date(),
          deadline: job.deadline || '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: '',
          gmail_thread_id: '',
          title: job.title,
          location: job.location,
          employer: job.employer || '',
          percent_or_workload: '',
          grade: job.grade || '',
          domain: job.domain || '',
          dg: job.dg || '',
          url: job.url,
          raw_snippet: job.rawSnippet || '',
          raw_source_id: job.url,
          run_id: runId,
        }));
      });
    }
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'EU',
    mode: 'crawler',
    label_or_endpoint: 'EU Careers / EU Other',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}

function rescoreEUCareers() {
  const result = rescoreJobsAllForSource_('EUCAREERS');
  Logger.log(JSON.stringify(result, null, 2));
}

// *****************************************
// JOBROOM
// *****************************************


function buildJobRoomSearchPayload_(keywords) {
  return {
    cantonCodes: [],
    communalCodes: [],
    companyName: null,
    displayRestricted: false,
    keywords: keywords || [],
    onlineSince: 5,
    permanent: null,
    professionCodes: [],
    workloadPercentageMax: 100,
    workloadPercentageMin: 10
  };
}

function fetchJobRoomJobsPage_(keywords, page, size) {
  const p = page || 0;
  const s = size || 20;
  
  const url =
    'https://www.job-room.ch/jobadservice/api/jobAdvertisements/_search' +
    '?page=' + p +
    '&size=' + s +
    '&sort=date_desc&_ng=ZGU=';
  
  const payload = buildJobRoomSearchPayload_(keywords);
  
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  
  const code = res.getResponseCode();
  const body = res.getContentText();

  if (/maintenance/i.test(body)) {
    throw new Error('JobRoom temporarily in maintenance');
  }

  if (code !== 200) {
    throw new Error('JobRoom API failed: HTTP ' + code + ' | body=' + body.slice(0, 1000));
  }
  
  return JSON.parse(body || '[]');
}

function extractJobRoomJobsFromJson_(items) {
  const jobs = [];
  
  (items || []).forEach(item => {
    const ad = item && item.jobAdvertisement;
    const jc = ad && ad.jobContent;
    if (!ad || !jc) return;
    
    const descs = Array.isArray(jc.jobDescriptions) ? jc.jobDescriptions : [];
    const deDesc =
    descs.find(d => String(d.languageIsoCode || '').toLowerCase() === 'de') ||
    descs[0] ||
    {};
    
    const title = String(deDesc.title || '').trim();
    const description = stripHtmlKn_(String(deDesc.description || ''));
    
    const company = jc.company || {};
    const employment = jc.employment || {};
    const location = jc.location || {};
    const publication = ad.publication || {};
    
    const employer = String(company.name || '').trim();
    
    const locationText = [
    location.postalCode,
    location.city
    ].filter(Boolean).join(' ');
    
    let percent = '';
    if (employment.workloadPercentageMin || employment.workloadPercentageMax) {
      const min = String(employment.workloadPercentageMin || '').trim();
      const max = String(employment.workloadPercentageMax || '').trim();
      
      if (min && max && min !== max) percent = min + ' - ' + max + '%';
      else if (min) percent = min + '%';
      else if (max) percent = max + '%';
    }
    
    const id = String(ad.id || '').trim();
    const externalUrl = String(jc.externalUrl || '').trim();
    
    const jobUrl = externalUrl || (
    id ? 'https://www.job-room.ch/job-publication-detail/' + encodeURIComponent(id) : ''
    );
    
    jobs.push({
      title,
      location: locationText,
      employer,
      percent_or_workload: percent,
      grade: '',
      domain: '',
      dg: '',
      deadline: '',
      description,
      url: jobUrl,
      rawSnippet: [title, employer, locationText, percent]
        .filter(Boolean)
        .join(' | ')
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanJobRoomJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 1;

  const queries = [
    ['ökonom'],
    ['pricing'],
    ['strategie'],
    ['regulierung']
  ];

  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 3;

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  queries.forEach(keywords => {
    for (let page = 0; page < pagesToScan; page++) {
      const items = fetchJobRoomJobsPage_(keywords, page, 20);
      const jobs = extractJobRoomJobsFromJson_(items);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'JOBROOM',
        source_label: CONFIG.gmailLabels.jobroom,
        mail_date: new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        detail_text: job.description || '',
        raw_source_id: job.url,
        run_id: runId,
      });

        const score = Number(normalized[jobsIdx.score] || 0);

        if (score >= minScoreToKeep) {
          rows.push(normalized);
        }
      });
    }
  });

  const upsertStats = upsertJobsToAll_(rows);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[jobsIdx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'JobRoom',
    mode: 'api',
    label_or_endpoint: CONFIG.gmailLabels.jobroom,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}


function rescoreJobroom() {
  const result = rescoreJobsAllForSource_('JOBROOM');
  Logger.log(JSON.stringify(result, null, 2));
}


// *****************************************
// SKYGUIDE
// *****************************************



function buildSkyguideUrl_() {
  return 'https://jobs.skyguide.ch/search?locale=de_DE';
}


function absolutizeSkyguideUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://jobs.skyguide.ch' + url;
  return 'https://jobs.skyguide.ch/' + url;
}

function parseSwissDate_(text) {
  const m = String(text || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return '';
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}


function extractSkyguideJobsFromHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
  
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*class="jobTitle-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;
  
  let match;
  while ((match = rowRegex.exec(cleaned)) !== null) {
    const rowHtml = match[0];
    const url = absolutizeSkyguideUrl_(match[1].trim());
    const title = stripHtmlSkyguide_(match[2]);
    
    if (!url || !title) continue;
    
    const tdValues = [...rowHtml.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)]
    .map(m => stripHtmlSkyguide_(m[1]))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let location = '';
    let department = '';
    let publicationDate = '';
    
    if (tdValues.length >= 2) location = tdValues[1] || '';
    if (tdValues.length >= 3) department = tdValues[2] || '';
    if (tdValues.length >= 4) publicationDate = tdValues[3] || '';
    
    jobs.push({
      title: htmlDecode_(title),
      location: htmlDecode_(location),
      employer: 'Skyguide',
      department: htmlDecode_(department),
      publication_date: parseSwissDate_(publicationDate),
      url,
      rawSnippet: `${title} | ${location} | ${department} | ${publicationDate}`
    });
  }
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanSkyguideJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const url = buildSkyguideUrl_();
  const html = fetchWithRetry_(url).getContentText();

  const jobs = extractSkyguideJobsFromHtml_(html);

  const rows = jobs.map(job => normalizeJobRecord_({
    source: 'SKYGUIDE',
    source_label: 'Crawler/Skyguide',
    mail_date: job.publication_date || new Date(),
    deadline: '',
    first_seen_at: new Date(),
    last_seen_at: new Date(),
    gmail_message_id: '',
    gmail_thread_id: '',
    title: job.title,
    location: job.location,
    employer: job.employer,
    percent_or_workload: '',
    grade: '',
    domain: job.department || '',
    dg: '',
    url: job.url,
    raw_snippet: job.rawSnippet || '',
    raw_source_id: job.url,
    run_id: runId,
  }));

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'Skyguide',
    mode: 'crawler',
    label_or_endpoint: 'Crawler/Skyguide',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: jobs.length,
    jobs_parsed: jobs.length,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// EUROCONTROL
// *****************************************

function fetchEurocontrolAjaxHtml_(pageJob) {
  const url = 'https://jobs.eurocontrol.int/wp-admin/admin-ajax.php';
  
  const payload = {
    action: 'lumesse_ajax_modern_list',
    lanugage: '1',
    sendEvent: 'false',
    'params[0][key]': 'per_page',
    'params[0][val]': '100'
  };
  
  if (pageJob && pageJob > 1) {
    payload['params[1][key]'] = 'page_job';
    payload['params[1][val]'] = String(pageJob);
  }
  
  let lastError = null;
  
  for (let i = 0; i < 3; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        payload,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const code = res.getResponseCode();
      if (code !== 200) {
        throw new Error('EUROCONTROL AJAX failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 500));
      }
      
      const data = JSON.parse(res.getContentText() || '{}');
      if (!data || !data.advertsHtml) {
        throw new Error('EUROCONTROL AJAX returned no advertsHtml');
      }
      
      return data.advertsHtml;
    } catch (e) {
      lastError = e;
      Utilities.sleep(1500);
    }
  }
  
  throw lastError;
}


function extractEurocontrolField_(itemHtml, fieldLabel) {
  const liMatches = [...String(itemHtml || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  
  for (const m of liMatches) {
    const liHtml = m[1];
    
    const labelMatch = liHtml.match(/<span[^>]*>\s*([^<]+?)\s*<\/span>\s*([\s\S]*)/i);
    if (!labelMatch) continue;
    
    const label = htmlDecode_(stripHtmlZrh_(labelMatch[1])).trim();
    const value = htmlDecode_(stripHtmlZrh_(labelMatch[2])).trim();
    
    if (normalizeText_(label) === normalizeText_(fieldLabel)) {
      return value;
    }
  }
  
  return '';
}


function parseEurocontrolDate_(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}



function extractEurocontrolJobsFromAjaxHtml_(html) {
  const jobs = [];
  
  const cleaned = String(html || '')
  .replace(/\\\//g, '/')
  .replace(/\\"/g, '"')
  .replace(/\\n/g, ' ')
  .replace(/\\t/g, ' ')
  .replace(/\s+/g, ' ');
  
  const itemRegex = /<li>\s*<div class="jobs-content"[\s\S]*?(?=<li>\s*<div class="jobs-content"|<\/ul>)/gi;
  const items = cleaned.match(itemRegex) || [];
  
  items.forEach(item => {
    const titleMatch = item.match(/<h3[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!titleMatch) return;
    
    const url = htmlDecode_(titleMatch[1].trim());
    const title = htmlDecode_(titleMatch[2].trim());
    
    const reference = extractEurocontrolField_(item, 'Reference Number');
    const closingDateText = extractEurocontrolField_(item, 'Closing date');
    const location = extractEurocontrolField_(item, 'Location');
    
    const pMatches = [...item.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => htmlDecode_(stripHtmlZrh_(m[1])))
    .map(s => s.trim())
    .filter(Boolean);
    
    const description = pMatches.join(' | ');
    
    let grade = '';
    const refUpper = String(reference || '').toUpperCase();
    const gradeMatch = refUpper.match(/(?:^|[-/ ])(AD|AST|FG)(?:[-/ ]|$)/);
    if (gradeMatch) grade = gradeMatch[1];
    
    jobs.push({
      title,
      location: location || '',
      employer: 'EUROCONTROL',
      percent_or_workload: '',
      grade,
      domain: '',
      dg: '',
      deadline: parseEurocontrolDate_(closingDateText),
      description,
      reference,
      url,
      rawSnippet: [title, reference, location, closingDateText, description]
      .filter(Boolean)
      .join(' | ')
    });
  });
  
  
  return dedupeJobsByMiniKey_(jobs);
}


function scanEurocontrolJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 2;
  let itemsSeen = 0;
  let parsedJobsCount = 0;

  for (let page = 1; page <= pagesToScan; page++) {
    const ajaxHtml = fetchEurocontrolAjaxHtml_(page);
    const jobs = extractEurocontrolJobsFromAjaxHtml_(ajaxHtml);

    itemsSeen += jobs.length;
    parsedJobsCount += jobs.length;

    jobs.forEach(job => {
      rows.push(normalizeJobRecord_({
        source: 'EUROCONTROL',
        source_label: CONFIG.gmailLabels.eurocontrol,
        mail_date: new Date(),
        deadline: job.deadline || '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'EUROCONTROL',
        percent_or_workload: '',
        grade: job.grade || '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        raw_source_id: job.url,
        run_id: runId,
      }));
    });
  }

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'Eurocontrol',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.eurocontrol,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}



// *****************************************
// DB
// *****************************************


function buildDbSearchResultUrl_(query, pageNum, itemsPerPage) {
  return 'https://db.jobs/service/search/de-de/5441588' +
  '?qli=true' +
  '&query=' + encodeURIComponent(query || '') +
  '&queryJoined=' +
  '&itemsPerPage=' + encodeURIComponent(itemsPerPage || 20) +
  '&pageNum=' + encodeURIComponent(pageNum || 0) +
  '&view=asSearchResult' +
  '&isMapTabDefault=false';
}




function absolutizeDbUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://db.jobs' + url;
  return 'https://db.jobs/' + url;
}


function extractDbJobsFromSearchResultHtml_(html) {
  const jobs = [];
  const source = String(html || '');
  
  const blocks = source.match(
  /<div class="o-searchpage__item o-searchpage__item--careers[\s\S]*?<\/a>\s*<\/div>/gi
  ) || [];
  
  blocks.forEach(block => {
    const jobIdMatch = block.match(/data-job-id="(\d+)"/i);
    const hrefMatch = block.match(/<a[^>]*href="([^"]+)"/i);
    const titleMatch = block.match(
    /<span class="m-search-hit__title-text"[^>]*>([\s\S]*?)<\/span>/i
    );
    
    if (!hrefMatch || !titleMatch) return;
    
    const jobId = jobIdMatch ? jobIdMatch[1] : '';
    const title = htmlDecode_(stripHtmlKn_(titleMatch[1])).trim();
    const url = absolutizeDbUrl_(htmlDecode_(hrefMatch[1]));
    
    if (!title || !url) return;
    
    const liTexts = [...block.matchAll(/<li class="m-search-hit__item"[\s\S]*?>([\s\S]*?)<\/li>/gi)]
    .map(m => htmlDecode_(stripHtmlKn_(m[1])).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
    
    let location = '';
    let employer = 'Deutsche Bahn';
    let percent = '';
    
    if (liTexts.length >= 1) location = liTexts[0];
    if (liTexts.length >= 2) employer = liTexts[1] || 'Deutsche Bahn';
    if (liTexts.length >= 4) percent = liTexts[3];
    
    const rawSnippet = [title, location, employer, percent].filter(Boolean).join(' | ');
    
    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: percent,
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet,
      raw_source_id: jobId || url
    });
  });
  
  return dedupeJobsByMiniKey_(jobs);
}




function scanDbJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const pagesToScan = 2;
  const queries = [
    'Strategie',
    'Analyst',
    'Regulierung',
    'Fachreferent',
    'Markt',
    'Wettbewerb',
    'Transformation',
    'Tarif'
  ];

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  queries.forEach(query => {
    for (let page = 0; page < pagesToScan; page++) {
      const url = buildDbSearchResultUrl_(query, page, 20);

      const html = fetchWithRetry_(url, 3, {
        method: 'get',
        muteHttpExceptions: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://db.jobs/de-de/Suche?query=' + encodeURIComponent(query),
          'Accept': 'text/html, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0'
        }
      }).getContentText();

      const jobs = extractDbJobsFromSearchResultHtml_(html);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      jobs.forEach(job => {
        rows.push(normalizeJobRecord_({
          source: 'DB',
          source_label: CONFIG.gmailLabels.db,
          mail_date: new Date(),
          deadline: '',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          gmail_message_id: '',
          gmail_thread_id: '',
          title: job.title,
          location: job.location,
          employer: job.employer,
          percent_or_workload: job.percent_or_workload || '',
          grade: '',
          domain: '',
          dg: '',
          url: job.url,
          raw_snippet: job.rawSnippet || '',
          raw_source_id: job.raw_source_id || job.url,
          run_id: runId,
        }));
      });
    }
  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[idx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'DB',
    mode: 'crawler',
    label_or_endpoint: CONFIG.gmailLabels.db,
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}

// *****************************************
// LH CRAWLER (NEU)
// *****************************************

const LH_QUERIES = [
  'analyst',
  'revenue',
  'revenue management',
  'procurement',
  'transformation'
];


function isLhInternship_(title) {

  const t = normalizeText_(title);

  return (
    /praktikum/.test(t) ||
    /praktikant/.test(t) ||
    /internship/.test(t) ||
    /working student/.test(t) ||
    /werkstudent/.test(t) ||
    /student/.test(t)
  );

}


function buildLhApiUrl_(query) {

  const payload = {
    LanguageCode: "DE",
    SearchParameters: {
      Sort: [{
        Criterion: "PublicationStartDate",
        Direction: "DESC"
      }]
    },
    SearchCriteria: [
      {
        CriterionName: "PositionFormattedDescription.Content",
        CriterionValue: [query]
      }
    ]
  };

  return "https://api-apply.lufthansagroup.careers/search/?data=" +
    encodeURIComponent(JSON.stringify(payload));

}


function extractLhJobsFromApi_(json) {

  const jobs = [];

  const items =
    json?.SearchResult?.SearchResultItems || [];

  items.forEach(item => {

    const d = item.MatchedObjectDescriptor;

    if (!d) return;

    const title = cleanLhText_(d.PositionTitle);

    if (isLhInternship_(title)) return;

    const employer =
      d.ParentOrganizationName || "Lufthansa Group";

    const locationObj =
      (d.PositionLocation || [])[0] || {};

    const location =
      [
        locationObj.CityName,
        locationObj.CountryName
      ].filter(Boolean).join(', ');

    const percent =
      (d.PositionSchedule || [])
        .map(x => x.Name)
        .join(' / ');

    const date =
      d.PublicationStartDate
        ? new Date(d.PublicationStartDate)
        : '';

    const url =
      d.PositionURI || '';

    const jobId =
      d.ID || url;

    jobs.push({
      title,
      employer,
      location,
      percent_or_workload: percent,
      publication_date: date,
      url,
      rawSnippet: [
        title,
        location,
        employer,
        percent
      ].filter(Boolean).join(' | '),
      raw_source_id: jobId
    });

  });

  return dedupeJobsByMiniKey_(jobs);

}

function scanLhApiJobsToAll(runId) {
  runId = runId || Utilities.getUuid();

  setupJobSheets_();

  const rows = [];
  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 4;

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  LH_QUERIES.forEach(query => {
    const url = buildLhApiUrl_(query);

    const response = fetchWithRetry_(url, 3, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const json = JSON.parse(response.getContentText());
    const jobs = extractLhJobsFromApi_(json);

    itemsSeen += jobs.length;
    parsedJobsCount += jobs.length;

    Logger.log(
      'LH query="' + query + '" => jobs: ' + jobs.length
    );

    jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'LH',
        source_label: 'Crawler/LH',
        mail_date: job.publication_date || new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location,
        employer: job.employer,
        percent_or_workload: job.percent_or_workload,
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet,
        raw_source_id: job.raw_source_id,
        run_id: runId,
      });

      const score = Number(normalized[jobsIdx.score] || 0);

      if (score >= minScoreToKeep) {
        rows.push(normalized);
      }
    });
  });

  const upsertStats = upsertJobsToAll_(rows);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {
    const category = String(row[jobsIdx.category] || '');
    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;
  });

  return {
    source: 'LH-Crawler',
    mode: 'api',
    label_or_endpoint: 'Crawler/LH',
    mail_threads: 0,
    mail_messages: 0,
    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,
    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,
    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,
    detail_fetch_attempted: 0,
    detail_fetch_count: 0,
    status: 'ok',
    message: ''
  };
}


function rescoreLh() {
  const result = rescoreJobsAllForSource_('LH');
  Logger.log(JSON.stringify(result, null, 2));
}




// *****************************************
// LH CRAWLER (PAUSIERT)
// *****************************************
// Status:
// - search_result liefert im Apps-Script-Fetch nur JS/Cookie-Shell
// - keine stabil parsbaren Jobkarten im HTML
// - Detailseiten (jobad&id=...) wären parsbar, aber es fehlt aktuell
//   eine robuste Quelle für direkte Job-URLs
// => daher vorerst deaktiviert; Mailquelle bleibt aktiv

function buildLhSearchResultUrl_(opts) {
  opts = opts || {};

  const language = opts.language || 2;
  const query = opts.query || '';
  const page = opts.page || 1;
  const itemsPerPage = opts.itemsPerPage || 100;
  const orderCriterion = opts.orderCriterion || 'date';
  const orderDirection = opts.orderDirection || 'DESC';

  let url =
    'https://apply.lufthansagroup.careers/index.php?ac=search_result' +
    '&language=' + encodeURIComponent(language) +
    '&search_parameter_page_current=' + encodeURIComponent(page) +
    '&search_parameter_item_per_page=' + encodeURIComponent(itemsPerPage) +
    '&search_parameter_order_criterion=' + encodeURIComponent(orderCriterion) +
    '&search_parameter_order_direction=' + encodeURIComponent(orderDirection);

  if (query) {
    url += '&search_criterion_keyword=' + encodeURIComponent(query);
  }

  return url;
}

function absolutizeLhUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return 'https://apply.lufthansagroup.careers' + url;
  return 'https://apply.lufthansagroup.careers/' + url;
}

function parseLhDate_(text) {
  const s = String(text || '').trim();

  let m = s.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  m = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  return '';
}

function cleanLhText_(text) {
  return htmlDecode_(stripHtmlKn_(text))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLhJobIdFromUrl_(url) {
  const m = String(url || '').match(/[?&]id=(\d+)/i);
  return m ? m[1] : '';
}

function normalizeLhTitle_(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*Read more$/i, '')
    .trim();
}

function looksLikeLhDate_(text) {
  return /\b\d{2}[./]\d{2}[./]\d{4}\b/.test(String(text || ''));
}

function looksLikeLhWorkload_(text) {
  return /(vollzeit|teilzeit|full[- ]?time|part[- ]?time|[0-9]{1,3}\s*-\s*[0-9]{1,3}%|[0-9]{1,3}%)/i.test(String(text || ''));
}

function getLhEmployerRegex_() {
  return new RegExp(
    '\\b(' +
      'lufthansa(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'swiss(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'austrian airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'brussels airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'eurowings(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'lufthansa technik(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'lufthansa cargo(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'discover airlines(?:\\s+[a-z0-9&.\\- ]+)?|' +
      'airplus(?:\\s+[a-z0-9&.\\- ]+)?' +
    ')\\b',
    'i'
  );
}

function getLhLocationRegex_() {
  return new RegExp(
    '\\b(' +
      'frankfurt(?:\\s*\\/\\s*main)?|' +
      'hamburg|' +
      'münchen|munich|' +
      'zürich(?:\\/kloten)?|zurich(?:\\/kloten)?|kloten|' +
      'wien|vienna|' +
      'köln|cologne|' +
      'berlin|' +
      'brussels|' +
      'bremen|' +
      'sofia|' +
      'malta|' +
      'bangalore|' +
      'delhi|' +
      'basel|' +
      'geneva|genf' +
    ')\\b',
    'i'
  );
}

function looksLikeLhEmployer_(text, title) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (looksLikeLhDate_(s)) return false;
  if (looksLikeLhWorkload_(s)) return false;
  if (normalizeText_(s) === normalizeText_(title)) return false;

  return getLhEmployerRegex_().test(s);
}

function looksLikeLhLocation_(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (looksLikeLhDate_(s)) return false;
  if (looksLikeLhWorkload_(s)) return false;

  return getLhLocationRegex_().test(s);
}

function isLikelyLhNoiseTitle_(title) {
  const t = normalizeText_(title);
  if (!t) return true;

  return (
    /^job portal$/.test(t) ||
    /^stellenmarkt$/.test(t) ||
    /^career opportunities$/.test(t) ||
    /^help$/.test(t) ||
    /^data privacy/.test(t) ||
    /^imprint$/.test(t) ||
    /^accessibility$/.test(t) ||
    /^faqs?$/.test(t) ||
    /^read more$/.test(t)
  );
}

function splitLhMetaCandidates_(blockText) {
  return String(blockText || '')
    .split(/\s*[|·•]\s*|\s{2,}/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => s.length >= 2);
}

function extractLhJobsFromSearchResultHtml_(html, debug) {
  const jobs = [];
  const cleaned = String(html || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\\\//g, '/')
    .trim();

  const blocks = cleaned.match(
    /<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?(?=<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+|$)/gi
  ) || [];

  if (debug) {
    Logger.log('LH raw candidate blocks: ' + blocks.length);
  }

  blocks.forEach((block, i) => {
    const urlMatch = block.match(/href="([^"]*index\.php\?ac=jobad&id=\d+[^"]*)"/i);
    if (!urlMatch) return;

    const url = absolutizeLhUrl_(htmlDecode_(urlMatch[1]).trim());
    const jobId = extractLhJobIdFromUrl_(url);

    const anchorTextMatch = block.match(
      /<a[^>]*href="[^"]*index\.php\?ac=jobad&id=\d+[^"]*"[^>]*>([\s\S]*?)<\/a>/i
    );

    const title = anchorTextMatch
      ? normalizeLhTitle_(cleanLhText_(anchorTextMatch[1]))
      : '';

    if (!title || title.length < 4 || isLikelyLhNoiseTitle_(title)) {
      if (debug) Logger.log('LH skip block ' + i + ' | bad title | ' + title);
      return;
    }

    const blockText = cleanLhText_(block);
    const metaParts = splitLhMetaCandidates_(blockText);

    let employer = '';
    let location = '';
    let percent = '';
    let publicationDate = '';

    metaParts.forEach(part => {
      if (!publicationDate && looksLikeLhDate_(part)) {
        const m = part.match(/\b\d{2}[./]\d{2}[./]\d{4}\b/);
        if (m) publicationDate = m[0];
        return;
      }

      if (!percent && looksLikeLhWorkload_(part)) {
        percent = part;
        return;
      }

      if (!employer && looksLikeLhEmployer_(part, title)) {
        employer = part;
        return;
      }

      if (!location && looksLikeLhLocation_(part) && !looksLikeLhEmployer_(part, title)) {
        location = part;
      }
    });

    if (!employer) {
      const employerMatch = blockText.match(getLhEmployerRegex_());
      if (employerMatch) employer = employerMatch[1].trim();
    }

    if (!location) {
      const locationMatch = blockText.match(getLhLocationRegex_());
      if (locationMatch) location = locationMatch[1].trim();
    }

    const rawSnippet = [title, employer, location, publicationDate, percent]
      .filter(Boolean)
      .join(' | ');

    const job = {
      title,
      employer: employer || 'Lufthansa Group',
      location,
      percent_or_workload: percent,
      publication_date: parseLhDate_(publicationDate),
      url,
      rawSnippet,
      raw_source_id: jobId || url
    };

    if (debug) {
      Logger.log('LH parsed job ' + i + ': ' + JSON.stringify(job));
    }

    jobs.push(job);
  });

  return dedupeJobsByMiniKey_(jobs);
}

function scanLhCrawlerJobsToAll(runId) {
  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];
  const jobsIdx = indexMap_(JOBS_ALL_COLUMNS);
  const minScoreToKeep = 4;

  const queries = [
    'strategy',
    'pricing',
    'analyst',
    'policy',
    'regulation',
    'competition',
    'market',
    'transformation'
  ];

  queries.forEach(query => {
    const url = buildLhSearchResultUrl_({
      query: query,
      language: 2,
      page: 1,
      itemsPerPage: 100
    });

    const html = fetchWithRetry_(url, 3, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }).getContentText();

    const jobs = extractLhJobsFromSearchResultHtml_(html, false);

    Logger.log('LH query="' + query + '" => parsed jobs: ' + jobs.length);

    jobs.forEach(job => {
      const normalized = normalizeJobRecord_({
        source: 'LH',
        source_label: 'Crawler/LH',
        mail_date: job.publication_date || new Date(),
        deadline: '',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        gmail_message_id: '',
        gmail_thread_id: '',
        title: job.title,
        location: job.location || '',
        employer: job.employer || 'Lufthansa Group',
        percent_or_workload: job.percent_or_workload || '',
        grade: '',
        domain: '',
        dg: '',
        url: job.url,
        raw_snippet: job.rawSnippet || '',
        raw_source_id: job.raw_source_id || job.url,
        run_id: runId,
      });

      const score = Number(normalized[jobsIdx.score] || 0);
      if (score >= minScoreToKeep) {
        rows.push(normalized);
      }
    });
  });

  upsertJobsToAll_(rows);
}

function testLhCrawlerParser_() {
  const url = buildLhSearchResultUrl_({
    query: 'strategy',
    language: 2,
    page: 1,
    itemsPerPage: 100
  });

  const html = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }).getContentText();

  const jobs = extractLhJobsFromSearchResultHtml_(html, true);

  Logger.log('LH test parser jobs found: ' + jobs.length);
  jobs.slice(0, 15).forEach(job => Logger.log(JSON.stringify(job)));
}


function testLhCrawlerParser() {
  return testLhCrawlerParser_();
}

function testLhFetchShell() {
  const url = buildLhSearchResultUrl_({
    query: 'strategy',
    language: 2,
    page: 1,
    itemsPerPage: 100
  });

  const html = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }).getContentText();

  Logger.log('LH html length: ' + html.length);
  Logger.log('contains jobad?id=: ' + /jobad&id=\d+/i.test(html));
  Logger.log('contains please wait: ' + /please wait/i.test(html));
  Logger.log('contains activate javascript: ' + /activate javascript/i.test(html));
  Logger.log('contains use of cookies: ' + /use of cookies/i.test(html));
  Logger.log(html.slice(0, 2000));
}




// *****************************************
// KN CRAWLER
// *****************************************

function extractKnSearchUrlFromHtml_(html, plain) {
  const source = String(html || '') + ' ' + String(plain || '');

  const patterns = [
    /href="(https:\/\/www\.arbeitsagentur\.de\/jobsuche\/suche\?[^"]+)"/i,
    /(https:\/\/www\.arbeitsagentur\.de\/jobsuche\/suche\?[^\s"'<>]+)/i
  ];

  for (const re of patterns) {
    const m = source.match(re);
    if (m) return htmlDecode_(m[1].trim());
  }

  return '';
}



function buildKnApiSearchUrl_(searchParams, page, size) {
  const base = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs';

  const params = Object.assign({}, searchParams || {});
  params.page = page || 1;
  params.size = size || 100;

  const allowedKeys = [
    'was',
    'wo',
    'berufsfeld',
    'arbeitgeber',
    'veroeffentlichtseit',
    'zeitarbeit',
    'pav',
    'angebotsart',
    'befristung',
    'arbeitszeit',
    'behinderung',
    'corona',
    'umkreis'
  ];

  const query = allowedKeys
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .concat(['page', 'size'])
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    .join('&');

  return base + '?' + query;
}




function fetchKnApiPage_(searchParams, page, size) {
  const url = buildKnApiSearchUrl_(searchParams, page, size);

  const res = fetchWithRetry_(url, 3, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'X-API-Key': 'jobboerse-jobsuche'
    }
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('KN API failed: HTTP ' + code + ' | body=' + res.getContentText().slice(0, 800));
  }

  return JSON.parse(res.getContentText() || '{}');
}





function extractKnJobsFromApiResponse_(json) {
  const jobs = [];
  const items = (json && json.stellenangebote) || [];

  items.forEach(item => {
    const refnr = String(item.refnr || '').trim();
    const hashId = String(item.hashId || '').trim();

    const ort = item.arbeitsort || {};
    const location = [
      ort.plz,
      ort.ort,
      ort.region
    ].filter(Boolean).join(' ').trim();

    const title = String(item.titel || item.beruf || '').trim();
    const employer = String(item.arbeitgeber || '').trim();
    const publicationDate = item.aktuelleVeroeffentlichungsdatum
      ? new Date(item.aktuelleVeroeffentlichungsdatum)
      : new Date();

    const url = refnr
      ? 'https://www.arbeitsagentur.de/jobsuche/jobdetail/' + encodeURIComponent(refnr)
      : '';

    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      deadline: '',
      publication_date: publicationDate,
      url,
      rawSnippet: JSON.stringify({
        titel: item.titel,
        beruf: item.beruf,
        arbeitgeber: item.arbeitgeber,
        refnr: item.refnr
      }),
      raw_source_id: refnr || hashId || url
    });
  });

  return dedupeKnJobsBySourceId_(jobs);
}

function dedupeKnJobsBySourceId_(jobs) {
  const seen = new Set();

  return jobs.filter(job => {
    const key = String(job.raw_source_id || '').trim()
      || [job.title, job.employer, job.location].map(v => normalizeKeyPart_(v)).join('|');

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}



function scanKnCrawlerJobsToAll(runId) {

  runId = runId || Utilities.getUuid();
  setupJobSheets_();

  const rows = [];

  const pageSize = 100;
  const maxPagesLimit = 10;

  const searchUrls = [
    'https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&wo=Konstanz&umkreis=10&arbeitszeit=vz;tz;ho&arbeitsort=Konstanz&zeitarbeit=true&veroeffentlichtseit=1'
  ];

  let itemsSeen = 0;
  let parsedJobsCount = 0;

  searchUrls.forEach(searchUrl => {

    const params = parseUrlQueryParams_(searchUrl);

    const apiSearchParams = {
      was: params.was || '',
      wo: params.wo || '',
      umkreis: params.umkreis || '',
      arbeitszeit: params.arbeitszeit || '',
      veroeffentlichtseit: params.veroeffentlichtseit || '',
      angebotsart: params.angebotsart || '',
      befristung: params.befristung || '',
      behinderung: params.behinderung || '',
      corona: params.corona || ''
    };

    // zeitarbeit bewusst NICHT übergeben
    // obwohl es im Web-Link vorkommt
    // da die API damit stark einschränkt

    let page = 1;
    let maxPages = 1;

    do {

      const json = fetchKnApiPage_(apiSearchParams, page, pageSize);
      const jobs = extractKnJobsFromApiResponse_(json);

      Logger.log('KN page=' + page + ' maxErgebnisse=' + json.maxErgebnisse);
      Logger.log('KN jobs on page ' + page + ': ' + jobs.length);

      itemsSeen += jobs.length;
      parsedJobsCount += jobs.length;

      const total = Number(json.maxErgebnisse || 0);

      if (total > 0) {
        maxPages = Math.min(
          maxPagesLimit,
          Math.max(1, Math.ceil(total / pageSize))
        );
      }

      jobs.forEach(job => {

        rows.push(normalizeJobRecord_({
          source: 'KN',
          source_label: 'Crawler/KN',

          mail_date: job.publication_date || new Date(),
          deadline: '',

          first_seen_at: new Date(),
          last_seen_at: new Date(),

          gmail_message_id: '',
          gmail_thread_id: '',

          title: job.title,
          location: job.location,
          employer: job.employer,

          percent_or_workload: '',
          grade: '',
          domain: '',
          dg: '',

          url: job.url,
          raw_snippet: job.rawSnippet || '',

          raw_source_id:
            job.raw_source_id ||
            extractKnJobIdFromUrl_(job.url) ||
            job.url,

          run_id: runId
        }));

      });

      page++;

    } while (page <= maxPages);

  });

  const upsertStats = upsertJobsToAll_(rows);
  const idx = indexMap_(JOBS_ALL_COLUMNS);

  let relevantCount = 0;
  let maybeCount = 0;
  let ignoreCount = 0;

  rows.forEach(row => {

    const category = String(row[idx.category] || '');

    if (category === 'Relevant') relevantCount++;
    else if (category === 'Vielleicht') maybeCount++;
    else if (category === 'Ignorieren') ignoreCount++;

  });

  return {
    source: 'KN-Crawler',
    mode: 'api',
    label_or_endpoint: 'Crawler/KN',

    mail_threads: 0,
    mail_messages: 0,

    items_seen: itemsSeen,
    jobs_parsed: parsedJobsCount,
    rows_input_to_upsert: rows.length,

    jobs_upserted: upsertStats.jobs_upserted,
    new_jobs: upsertStats.new_jobs,
    updated_jobs: upsertStats.updated_jobs,

    relevant_count: relevantCount,
    maybe_count: maybeCount,
    ignore_count: ignoreCount,

    detail_fetch_attempted: 0,
    detail_fetch_count: 0,

    status: 'ok',
    message: ''
  };
}


function testKnCrawler() {
  const runId = Utilities.getUuid();

  try {
    const result = scanKnCrawlerJobsToAll(runId);
    Logger.log('RESULT_JSON: ' + JSON.stringify(result, null, 2));
  } catch (e) {
    Logger.log('ERROR: ' + e);
    Logger.log('STACK: ' + (e && e.stack ? e.stack : 'no stack'));
    throw e;
  }
}



function testKnApiVariants() {
  const variants = [
    {
      name: 'base',
      params: {
        angebotsart: '1',
        wo: 'Konstanz',
        umkreis: '10',
        arbeitszeit: 'vz;tz;ho',
        zeitarbeit: 'true',
        veroeffentlichtseit: '1'
      }
    },
    {
      name: 'with_pav_true',
      params: {
        angebotsart: '1',
        wo: 'Konstanz',
        umkreis: '10',
        arbeitszeit: 'vz;tz;ho',
        zeitarbeit: 'true',
        veroeffentlichtseit: '1',
        pav: 'true'
      }
    },
    {
      name: 'without_zeitarbeit',
      params: {
        angebotsart: '1',
        wo: 'Konstanz',
        umkreis: '10',
        arbeitszeit: 'vz;tz;ho',
        veroeffentlichtseit: '1'
      }
    },
    {
      name: 'with_pav_true_without_zeitarbeit',
      params: {
        angebotsart: '1',
        wo: 'Konstanz',
        umkreis: '10',
        arbeitszeit: 'vz;tz;ho',
        veroeffentlichtseit: '1',
        pav: 'true'
      }
    }
  ];

  variants.forEach(v => {
    const json = fetchKnApiPage_(v.params, 1, 100);
    const jobs = extractKnJobsFromApiResponse_(json);

    Logger.log('VARIANT: ' + v.name);
    Logger.log('URL: ' + buildKnApiSearchUrl_(v.params, 1, 100));
    Logger.log('maxErgebnisse: ' + json.maxErgebnisse);
    Logger.log('jobs.length: ' + jobs.length);
    Logger.log('titles: ' + JSON.stringify(jobs.slice(0, 10).map(j => ({
      title: j.title,
      employer: j.employer,
      location: j.location
    })), null, 2));
  });
}



function testKnCrawlerTopHits() {
  const runId = Utilities.getUuid();
  const result = scanKnCrawlerJobsToAll(runId);
  Logger.log('RESULT_JSON: ' + JSON.stringify(result, null, 2));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.jobsAll);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = indexMap_(headers);

  const knRows = data.slice(1)
    .filter(r => String(r[idx.source_label] || '') === 'Crawler/KN')
    .sort((a, b) => Number(b[idx.score] || 0) - Number(a[idx.score] || 0))
    .slice(0, 20);

  knRows.forEach((r, i) => {
    Logger.log(
      (i + 1) + '. ' +
      String(r[idx.title] || '') + ' | ' +
      String(r[idx.employer] || '') + ' | ' +
      String(r[idx.location] || '') + ' | ' +
      'score=' + String(r[idx.score] || '') + ' | ' +
      'cat=' + String(r[idx.category] || '')
    );
  });
}


function testKnApiRawSample() {
  const params = {
    wo: 'Konstanz',
    umkreis: '10',
    arbeitszeit: 'vz;tz;ho',
    veroeffentlichtseit: '1',
    angebotsart: '1'
  };

  const json = fetchKnApiPage_(params, 1, 5);

  Logger.log('RAW JSON KEYS: ' + Object.keys(json).join(', '));

  const items = json.stellenangebote || [];
  Logger.log('ITEM COUNT: ' + items.length);

  items.slice(0, 5).forEach((item, i) => {
    Logger.log('--- ITEM ' + (i + 1) + ' ---');
    Logger.log(JSON.stringify(item, null, 2));
  });
}


// *****************************************
// 9. GEMEINSAME UTILITIES
// *****************************************



function daysAgo_(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}


function isMessageRecentEnough_(messageDate, maxAgeDays) {
  if (!(messageDate instanceof Date)) return false;
  return messageDate >= daysAgo_(maxAgeDays);
}


function getMessagesForLabel_(labelName, maxThreads) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) throw new Error('Label nicht gefunden: ' + labelName);
  
  const limit = maxThreads || 200;
  const batchSize = 100;
  const messages = [];
  
  for (let start = 0; start < limit; start += batchSize) {
    const threads = label.getThreads(start, Math.min(batchSize, limit - start));
    if (!threads.length) break;
    
    threads.forEach(thread => {
      thread.getMessages().forEach(message => messages.push(message));
    });
  }
  
  return messages;
}


function fetchWithRetry_(url, attempts, options) {

  const maxAttempts = attempts || 3;

  for (let i = 0; i < maxAttempts; i++) {

    try {

      const res = UrlFetchApp.fetch(url, options || {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const code = res.getResponseCode();

      if (code >= 200 && code < 300) return res;

      throw new Error('HTTP ' + code);

    } catch (e) {

      if (i === maxAttempts - 1) throw e;

      Utilities.sleep(2000);
    }
  }
}



function buildShortSnippet_(message) {
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
  
  if (plain) return plain.slice(0, 300);
  
  const html = String(message.getBody ? (message.getBody() || '') : '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
  
  return html.slice(0, 300);
}



function normalizeUrlForKey_(source, url) {
  let u = String(url || '').trim();
  if (!u) return '';
  
  if (String(source || '').toLowerCase() === 'jobroom') {
    u = u.replace(/([?&])cache=[^&]+/gi, '$1');
    u = u.replace(/[?&]$/g, '');
  }
  
  return u;
}


function extractLhJobIdFromUrl_(url) {
  const u = String(url || '').trim();
  if (!u) return '';

  const m = u.match(/[?&]id=(\d+)/i);
  return m ? m[1] : '';
}


function buildUniqueKey_(source, title, employer, location, url, rawSourceId) {
  const src = String(source || '').toLowerCase();
  const normalizedUrl = normalizeUrlForKey_(source, url);
  const rawId = String(rawSourceId || '').trim();

  // LH: prefer stable job id from URL over rawSourceId
  if (src === 'lh') {
    const lhJobId = extractLhJobIdFromUrl_(url) || rawId;
    if (lhJobId) {
      const raw = [src, lhJobId].map(v => normalizeKeyPart_(v)).join('|');
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
      return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    }
  }

  if (rawId && ['airbus', 'kn'].includes(src)) {
    const raw = [src, rawId].map(v => normalizeKeyPart_(v)).join('|');
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
    return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  }

  const raw = [source, title, employer, location, normalizedUrl]
    .map(v => normalizeKeyPart_(v))
    .join('|');

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function normalizeKeyPart_(value) {
  return String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/https?:\/\//g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
}



function assertSheetHeadersExact_(sheet, expectedHeaders) {
  if (!sheet) throw new Error('Sheet is missing');

  const lastCol = sheet.getLastColumn();
  const width = Math.max(lastCol, expectedHeaders.length);

  const actualHeaders = sheet.getRange(1, 1, 1, width).getValues()[0]
    .slice(0, expectedHeaders.length)
    .map(h => String(h || '').trim());

  const expected = expectedHeaders.map(h => String(h || '').trim());

  const sameLength = actualHeaders.length === expected.length;
  const sameValues = sameLength && expected.every((h, i) => actualHeaders[i] === h);

  if (!sameValues) {
    const diffs = [];
    for (let i = 0; i < expected.length; i++) {
      if (actualHeaders[i] !== expected[i]) {
        diffs.push(
          (i + 1) + ': expected="' + expected[i] + '" actual="' + (actualHeaders[i] || '') + '"'
        );
      }
      if (diffs.length >= 8) break;
    }

    throw new Error(
      'Header mismatch in sheet "' + sheet.getName() + '". ' +
      'Migration or manual repair required. ' +
      'Differences: ' + diffs.join(' | ')
    );
  }
}



function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  assertSheetHeadersExact_(sheet, headers);
}

function rewriteSheet_(sheet, allRows) {
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
}

function indexMap_(headers) {
  return headers.reduce((acc, h, i) => {
    acc[h] = i;
    return acc;
  }, {});
}

function asDateOrBlank_(value) {
  return value instanceof Date ? value : (value ? new Date(value) : '');
}

function normalizeText_(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function htmlDecode_(text) {
  return String(text || '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&uuml;/g, 'ü')
  .replace(/&ouml;/g, 'ö')
  .replace(/&auml;/g, 'ä')
  .replace(/&szlig;/g, 'ß')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

function dedupeJobsByMiniKey_(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = [job.title, job.location, job.url].map(v => normalizeKeyPart_(v)).join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function dedupeRowsByUniqueKey_(rows, idx) {
  const seen = new Set();
  const result = [];

  rows.forEach(row => {
    const key = String(row[idx.unique_key] || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });

  return result;
}


function dedupeRowsForMail_(rows, idx) {
  const seen = new Set();
  const result = [];

  rows.forEach(row => {
    const key =
      String(row[idx.url] || '').trim() ||
      String(row[idx.unique_key] || '').trim() ||
      [
        row[idx.title] || '',
        row[idx.employer] || '',
        row[idx.location] || ''
      ].join('|');

    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(row);
  });

  return result;
}


// *****************************************
// 9b. WORKDAY-HELPER
// *****************************************

function cleanWorkdayMailHtml_(html) {
  return String(html || '')
    .replace(/=\r?\n/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/=3D/g, '=')
    .replace(/=C3=BC/gi, 'ü')
    .replace(/=C3=A4/gi, 'ä')
    .replace(/=C3=B6/gi, 'ö')
    .replace(/=C3=9F/gi, 'ß')
    .replace(/=C3=A9/gi, 'é')
    .replace(/=20/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function extractWorkdayJobIdFromUrl_(url) {
  const m = String(url || '').match(/(JR\d+)/i);
  return m ? m[1].toUpperCase() : '';
}


function findJobPostingJsonLdFromHtml_(html) {
  const matches = [...String(html || '').matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of arr) {
        if (!item) continue;

        if (item['@type'] === 'JobPosting') return item;

        if (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')) {
          return item;
        }

        if (item.mainEntity && item.mainEntity['@type'] === 'JobPosting') {
          return item.mainEntity;
        }
      }
    } catch (e) {
      // ignore malformed JSON-LD
    }
  }

  return null;
}


function extractMetaContentByNameGeneric_(html, name) {
  const re = new RegExp(
    '<meta[^>]+name="' + escapeRegexGeneric_(name) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractMetaContentByPropertyGeneric_(html, property) {
  const re = new RegExp(
    '<meta[^>]+property="' + escapeRegexGeneric_(property) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractLabeledValueFromHtmlTextGeneric_(html, label) {
  const text = stripHtmlKn_(html);
  const re = new RegExp(
    escapeRegexGeneric_(label) + '\\s*[:|-]?\\s*([^|\\n\\r]{1,120})',
    'i'
  );
  const m = text.match(re);
  return m ? String(m[1] || '').trim() : '';
}


function cleanWorkdayDetailText_(text, maxLen) {
  const cleaned = stripHtmlKn_(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return cleaned.slice(0, maxLen || 5000);
}


function escapeRegexGeneric_(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function extractWorkdayLocationFromTrailingText_(text) {
  let t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return '';

  let m = t.match(/^\(([^)]+)\)/);
  if (m) return m[1].trim();

  m = t.match(/^[-–—:,]\s*(.+)$/);
  if (m) return m[1].trim();

  m = t.match(/^([A-Z][A-Za-zÀ-ÿ' .\/-]{1,80})$/);
  if (m) return m[1].trim();

  return '';
}


/**
 * Generischer Workday-Newsletter-Parser:
 * <a href=".../JR12345678">Job Title</a> (Location)
 */
function extractWorkdayJobsFromHtml_(html, sourceOptions) {
  const opts = sourceOptions || {};
  const urlPattern = opts.urlPattern || 'https:\\/\\/[^"]*myworkdayjobs\\.com\\/[^"]*\\/JR\\d+[^"]*';
  const employer = opts.employer || '';
  const cleaned = cleanWorkdayMailHtml_(html);

  const regex = new RegExp(
    '<a[^>]*href="(' + urlPattern + ')"[^>]*>([\\s\\S]*?)<\\/a>\\s*([\\s\\S]{0,180}?)(?=<a\\b|<br\\b|<\\/td>|<\\/div>|<\\/p>|<\\/tr>|$)',
    'gi'
  );

  const jobs = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(stripHtmlKn_(match[2]).trim());
    const trailing = htmlDecode_(stripHtmlKn_(match[3]).trim());

    const rawSourceId = extractWorkdayJobIdFromUrl_(url);
    const location = extractWorkdayLocationFromTrailingText_(trailing);

    if (!title || !url || !rawSourceId) continue;

    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, location].filter(Boolean).join(' | '),
      raw_source_id: rawSourceId
    });
  }

  return dedupeJobsByMiniKey_(jobs);
}


function extractWorkdayDetailFromHtml_(html, options) {
  const opts = options || {};
  const fallbackEmployer = opts.fallbackEmployer || '';
  const departmentLabels = opts.departmentLabels || [
    'Department',
    'Organization',
    'Organisation',
    'Job Family'
  ];

  const employmentTypeLabels = opts.employmentTypeLabels || [
    'Employment Type',
    'Employment type',
    'Worker Type',
    'Time Type'
  ];
  const jobPosting = findJobPostingJsonLdFromHtml_(html);

  let detailText = '';
  let department = '';
  let employmentType = '';
  let employer = fallbackEmployer;
  let postingDate = '';

  if (jobPosting) {
    detailText = cleanWorkdayDetailText_(jobPosting.description || '', 5000);
    employmentType = String(jobPosting.employmentType || '').trim();
    postingDate = String(jobPosting.datePosted || '').trim();

    if (jobPosting.hiringOrganization) {
      if (typeof jobPosting.hiringOrganization === 'string') {
        employer = jobPosting.hiringOrganization.trim();
      } else if (jobPosting.hiringOrganization.name) {
        employer = String(jobPosting.hiringOrganization.name).trim();
      }
    }
  }

  if (!detailText) {
    const metaDesc =
      extractMetaContentByNameGeneric_(html, 'description') ||
      extractMetaContentByPropertyGeneric_(html, 'og:description') ||
      '';
    detailText = cleanWorkdayDetailText_(metaDesc, 5000);
  }

  if (!employmentType) {
    const m = stripHtmlKn_(html).match(/Employment Type:\s*([^\-|]{1,80})/i);
    if (m) employmentType = String(m[1] || '').trim();
  }

  if (!department) {
    const m = stripHtmlKn_(html).match(/Job Family:\s*([^\-|]{1,80})/i);
    if (m) department = String(m[1] || '').trim();
  }

  return {
    detail_text: detailText,
    department,
    employmentType,
    employer,
    postingDate
  };
}




// *****************************************
// 10. HTML-/Text-Helfer
// *****************************************


function stripHtmlZrh_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
}


function extractAirbusLocationFromFollowingHtml_(htmlFragment) {
  const text = htmlDecode_(stripHtmlKn_(htmlFragment))
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  // typischer Airbus-Fall: "(Brasov (30 Hermann))"
  const parenStart = text.indexOf('(');
  if (parenStart !== -1) {
    let depth = 0;
    let out = '';

    for (let i = parenStart; i < text.length; i++) {
      const ch = text[i];
      out += ch;

      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          return out.slice(1, -1).trim();
        }
      }
    }
  }

  // Fallback: bis zum ersten stärkeren Trenner
  const fallback = text.split(/(?:\bWenn Sie\b|Mit freundlichen Grüßen|Folgen Sie uns auf|Stellen-Alerts verwalten)/i)[0]
    .trim();

  return fallback.slice(0, 100).trim();
}


function stripHtmlKn_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&uuml;/gi, 'ü')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&auml;/gi, 'ä')
  .replace(/&szlig;/gi, 'ß')
  .replace(/\s+/g, ' ')
  .trim();
}



function stripHtmlSkyguide_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&uuml;/gi, 'ü')
  .replace(/&ouml;/gi, 'ö')
  .replace(/&auml;/gi, 'ä')
  .replace(/\s+/g, ' ')
  .trim();
}



function stripHtmlEu_(html) {
  return String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
}


function parseUrlQueryParams_(url) {
  const out = {};
  const q = String(url || '').split('?')[1] || '';
  if (!q) return out;

  q.split('&').forEach(pair => {
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '').trim();
    const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' ')).trim();
    if (key) out[key] = value;
  });

  return out;
}
