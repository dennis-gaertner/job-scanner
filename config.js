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
    scoringCockpit: 'Scoring_Cockpit',
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
        'ökonom*': 12,
        'oekonom*': 12,
        'wirtschaft*': 9,
        'analys*': 7,
        'strateg*': 9,
        'steuerung': 5,
        'grundsatz': 4,
        'planung': 3,
        'daten': 4,
        'data': 4,
        'modell': 6,
        'wissenschaft*': 4,
        'forschung': 3,
        'digitalpolitik': 4,
        'verwaltungsdigitalisierung': 5,
        'finanzen': 4,
        'haushalt': 4,
        'referent*': 4,
        'leiter*':3,
        'leitung*':3,
        'infrastruktur':4,
        'öpnv*':3,
        'verkehr*':3,
        'tarif*':3,
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
        'pharmazie': -5,
        'bautechnik': -5,
        'denkmal': -4,
        'kultur': -3,
        'personalrecht': -5,
        'personalorganisation': -5,
        'rechtsstelle': -4,
        'jurist*': -6,
      },
      bonusPatterns: { },
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
    bundat: {
      positiveKeywords: {
        'ökonom': 12,
        'oekonom': 12,
        'volkswirtschaft': 8,
        'wirtschaft': 4,

        'analyse': 7,
        'analyst': 8,

        'strategie': 8,
        'strategisch': 6,
        'steuerung': 6,          // leicht erhöht
        'grundsatz': 8,
        'politik': 5,            // neu
        'policy': 6,

        'daten': 4,
        'data': 4,
        'modell': 6,
        'modellierung': 6,
        'statistik': 5,

        'wissenschaft': 4,
        'wissenschaftlich': 4,
        'forschung': 3,

        'monitoring': 2,
        'evaluation': 3,

        'regulierung': 5,
        'regulierungs': 5,
        'wettbewerb': 6,
        'wettbewerbs': 6,

        'finanzen': 4,
        'haushalt': 4,
        'budget': 4,

        'koordination': 2,
        'international': 2,
        'eu': 2,

        // 🔥 neu – Governance / Risk
        'risiko': 6,
        'risikomanagement': 7,
        'governance': 6,
        'compliance': 6,

        // 🔥 Referenten
        'referent': 5,
        'referentin': 5,
        'referats': 3
      },

      negativeKeywords: {
        'assistenz': -6,
        'assistent': -6,
        'sekretariat': -6,
        'sachbearbeiter': -6,
        'administration': -4,
        'verwaltung': -2,

        'pfleger': -8,
        'pflege': -8,

        'pädagog': -6,
        'kindergarten': -8,
        'schule': -3,
        'lehrer': -6,

        'jurist': -4,
        'juristin': -4,
        'rechtsangelegenheiten': -4,
        'rechtsfragen': -4,
        'rechtsdienst': -4,

        // ⚠️ entschärft
        'it administrator': -6,
        'it-administrator': -6,
        'administrator': -4,
        'system engineer': -6,
        'technische infrastruktur': -4,
        'server': -4,
        'helpdesk': -6,
        'support': -4,

        'reinigung': -10,
        'küche': -10,
        'hausdienst': -10,
        'teamassistent': -8,
        'teamassistenz': -8
      },

      bonusPatterns: {
        'strategie': 2,
        'steuerung': 2,
        'grundsatz': 2,
        'risiko': 2
      },

      hardReject: [
        'sekretariat',
        'reinigung',
        'küche',
        'hausdienst'
      ],

      thresholds: {
        relevant: 12,
        maybe: 5
      }
    },
    bundch: {
      positiveKeywords: {
        '*ökonom*': 6,
        '*oekonom*': 6,
        '*wirtschaft*': 4,
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
        '*wettbewerb*': 5,
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
        'gallen': 0,   //tempting, but: dont want to punish "zürich, basel, st.gallen"     
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
        'kundenberat*': -5,
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
        'wäscherei',
        'gerichtsschreiber*'
      ],
      thresholds: {
        relevant: 8,
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
      bonusPatterns: { },
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
        'quereinstieg',
        'polier*',
        'vorarbeiter*'
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
        'projekt': 1,
        'kämmerei': 3,
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
        'apprenti*',
        're:\\balt\\s+2026\\b',
        'VIE'
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
        'project manager': 2,
        'project officer': 2,
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
        'project officer': 2,
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
        'assistant',
        'traineeship'
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
        'strateg*': 6,
        'economic': 3,
        'economics': 3,
        'volkswirtschaft': 5,
        'risk*': 6,
        'risiko*': 6,
        'wirtschaft': 3,
        'pricing': 5,
        'preis': 4,
        'tarif': 4,
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
        //'strategy manager': +2
      },
      negativeKeywords: {
        'gallen': 0,   //tempting, but: dont want to punish "zürich, basel, st.gallen"     
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
        maybe: 2
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
    },
    stadtwien: {
      positiveKeywords: {
        'ökonom': 10,
        'oekonom': 10,
        'volkswirtschaft': 8,
        'wirtschaft': 3,

        'analyse': 6,
        'analyst': 7,
        'datenanalyse': 6,
        'daten': 3,
        'data': 3,

        'strategie': 8,
        'strategisch': 6,
        'steuerung': 6,          // leicht erhöht
        'grundsatz': 8,          // neu + stark
        'politik': 5,            // neu
        'policy': 5,

        'koordination': 2,
        'monitoring': 2,
        'evaluation': 3,

        'digitalisierung': 5,
        'digital': 3,

        'innovation': 3,
        'entwicklung': 2,
        'projekt': 2,
        'projektmanagement': 3,
        'prozessmanagement': 2,

        'wissenschaft': 3,
        'wissenschaftlich': 3,
        'forschung': 2,

        'regulierung': 4,
        'wettbewerb': 5,

        'finanzen': 3,
        'budget': 3,
        'haushalt': 3,

        'mobilität': 3,
        'verkehr': 2,
        'infrastruktur': 2,
        'umweltökonomie': 5,
        'klima': 2,

        // 🔥 neu – Governance / Risk
        'risiko': 6,
        'risikomanagement': 7,
        'governance': 6,
        'compliance': 6,

        // 🔥 wichtig – Referentenrollen
        'referent': 5,
        'referentin': 5
      },

      negativeKeywords: {
        'pflege': -8,
        'krankenpflege': -8,
        'gesundheits': -4,
        'therapeut': -8,
        'ergotherapeut': -10,
        'physiotherapeut': -10,
        'dgkp': -10,

        'pädagog': -6,
        'kindergarten': -8,
        'schule': -3,
        'lehrperson': -8,
        'hochschullehrperson': -10,

        'assistenz': -6,
        'assistent': -6,
        'sekretariat': -6,
        'sachbearbeiter': -5,
        'administration': -4,
        'kanzlei': -6,

        'reinigung': -10,
        'küche': -10,
        'hausarbeiter': -10,
        'handwerk': -8,
        'installateur': -10,
        'fahrer': -8,

        'polizei': -6,

        'jurist': -4,
        'juristin': -4,
        'rechts': -2,

        'marketing': -3,
        'kundenservice': -4,

        // ⚠️ entschärft
        'it': -1,
        'security': -1,
        'cyber': -2,
        'system engineer': -6,
        'administrator': -5,
        'support': -4
      },

      bonusPatterns: {
        'stadt wien': 1,
        'digitalisierung': 2,
        'strategie': 2,
        'steuerung': 2,      // erhöht
        'grundsatz': 2,      // neu
        'risiko': 2          // neu
      },

      hardReject: [
        'ergotherapeut',
        'physiotherapeut',
        'dgkp',
        'hochschullehrperson',
        'reinigung',
        'küche',
        'installateur'
      ],

      thresholds: {
        relevant: 11,
        maybe: 5
      }
    },
  },
  roleModel: {
    titlePositiveKeywords: {
    },

    contextPositiveKeywords: {
    },

    hardReject: [
      'hochschulprakt*',
      'praktikant*',
      'werkstudent*',
      'postdoktorand*',
      'working student',
      'internship',
      'stagiaire',
      'apprentice',
      'apprenti',
      'alternant',
      'alternance',
      'apprenticeship',

      'mechaniker*',
      'mechatroniker*',
      'installateur*',
      'monteur*',
      'schreiner*',
      'sanitär*',
      'lackierer*',
      'baumaschinenführer*',
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
      'krankenpflege',

      'facharzt*',
      'fachärzt*',

      'volljurist*'
    ],

    enabledSources: [
      'jobroom',
      'bundde',
      'bundch',
      'bundat',
      'eucareers',
      'eurocontrol',
      'lh',
      'zrh',
      'airbus',
      'skyguide',
      'oebb',
      'sbb',
      'kn',
      'db',
      'stadtwien',
    ]
  },
  notification: {
    recipient: Session.getActiveUser().getEmail(),
    subjectPrefix: '[Job-Alert Elmar] ',
  },
recency: {
  bundLookbackDays: 3,
  oebbLookbackDays: 3,
  sbbLookbackDays: 3,
  knLookbackDays: 3,
  lhLookbackDays: 3,
  zrhLookbackDays: 3,
  airbusLookbackDays: 3,
  staleIrrelevantDays: 30, //when job becomes stale in Relevant_All
  staleStatusDays: 28, //when job becomes stale in Jobs_All
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

  testSink: {
    spreadsheetId: '1pl3KVLXsDdrYpwyc_5pLjPN9f-5KsTd9oPnFIQ0edTM',
    sheets: {
      aaCities: 'AA_Cities_Test',
      bundAt: 'BundAT_Test',
      stadtWien: 'StadtWien_Test',
    }
  },



};

const JOBS_ALL_COLUMNS = [
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
  'hard_reject_hits',
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


const JOBS_COCKPIT_COLUMNS = [
  'new_flag',
  'quick_flag',
  'source',
  'location',
  'job_state',
  'display_title', // ← statt 'title'
  'employer',
  'seen_at',
  'job_age',
  'deadline',
  'days_to_deadline',
  'url',
  'score_normalized',
  'final_score',
  'category',
  'final_category',
  'positive_hits',
  'negative_hits',
  'hard_reject_hit',
  'hard_reject_hits',
  'application_status',
  'visibility_preference',
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'manual_title',
  'notes',
  'visibility_rank',
  'work_rank',
  'job_state_rank',
  'category_rank',
  'unique_key'
];


const JOBS_USER_COLUMNS = [
  'unique_key',
  'quick_flag',
  'application_status',
  'job_state',
  'visibility_preference',
  'status',              // ⚠️ deprecated
  'manual_title',
  'notes',
  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'created_at',
  'updated_at'
];
// status:
// - DEPRECATED (legacy field from pre-split status model)
// - DO NOT USE for new logic
// - replaced by:
//     - application_status
//     - job_state
//     - visibility_preference
// - kept only for backward compatibility / migration

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
  'url',

  'manual_category',
  'manual_score_delta',
  'learn_from_feedback',
  'notes',

  'category',
  'score',
  'score_normalized',
  'positive',
  'negative',

  'hard_reject_hit',
  'hard_reject_hits',

  'deadline',
  'mail_date',
  'grade',
  'percent_or_workload',
  'domain',
  'dg',
  'source_label',

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


const ENABLE_AUTO_ARCHIVE = true;


